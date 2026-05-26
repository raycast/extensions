import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { extractCmdError, runShell } from "./shell";

export interface ReplaceResult {
  success: boolean;
  error?: string;
  needsAdmin?: boolean;
}

export type ProgressFn = (label: string) => void;

async function mkTempDir(): Promise<string> {
  const dir = path.join(
    os.tmpdir(),
    `mac-updater-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function quitApp(appName: string): Promise<void> {
  try {
    // Best effort — ignore if not running
    await runShell(
      `osascript -e 'tell application "${escapeAS(appName)}" to quit' 2>/dev/null`,
    );
    // Give it a moment to actually quit
    await new Promise((r) => setTimeout(r, 1500));
  } catch {
    // ignore
  }
}

function escapeAS(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function shq(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

async function downloadFile(
  url: string,
  destPath: string,
  onProgress?: ProgressFn,
): Promise<void> {
  onProgress?.("Downloading…");
  // -L follow redirects, --fail to error on 4xx/5xx, --max-time 10 min
  await runShell(
    `/usr/bin/curl -fsSL --max-time 600 -A 'Mac Updater/1.0' -o ${shq(destPath)} ${shq(url)}`,
  );
}

async function detectArchive(
  filePath: string,
): Promise<"dmg" | "zip" | "pkg" | "unknown"> {
  // First check by extension
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".dmg")) return "dmg";
  if (lower.endsWith(".zip")) return "zip";
  if (lower.endsWith(".pkg")) return "pkg";
  // Fall back to file(1)
  try {
    const { stdout } = await runShell(`/usr/bin/file -b ${shq(filePath)}`);
    if (/disk image|udif/i.test(stdout)) return "dmg";
    if (/zip archive/i.test(stdout)) return "zip";
    if (/xar archive|installer package/i.test(stdout)) return "pkg";
  } catch {
    // ignore
  }
  return "unknown";
}

async function extractApp(
  archivePath: string,
  workDir: string,
  onProgress?: ProgressFn,
): Promise<string | null> {
  const type = await detectArchive(archivePath);
  if (type === "dmg") return extractFromDmg(archivePath, onProgress);
  if (type === "zip") return extractFromZip(archivePath, workDir, onProgress);
  if (type === "pkg") return null; // pkg installers need separate handling
  return null;
}

interface MountedDmg {
  mountPoint: string;
  detach: () => Promise<void>;
}

async function mountDmg(dmgPath: string): Promise<MountedDmg | null> {
  try {
    const { stdout } = await runShell(
      `/usr/bin/hdiutil attach -nobrowse -readonly -noverify -noautoopen -plist ${shq(dmgPath)}`,
    );
    // Parse the plist output to find a mount point
    const match = stdout.match(
      /<key>mount-point<\/key>\s*<string>([^<]+)<\/string>/,
    );
    if (!match) return null;
    const mountPoint = match[1];
    return {
      mountPoint,
      detach: async () => {
        try {
          await runShell(
            `/usr/bin/hdiutil detach ${shq(mountPoint)} -force 2>/dev/null`,
          );
        } catch {
          // ignore
        }
      },
    };
  } catch {
    return null;
  }
}

async function findAppIn(dir: string): Promise<string | null> {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir);
  // Direct .app
  for (const e of entries) {
    if (e.endsWith(".app")) return path.join(dir, e);
  }
  // Look one level deeper (apps sometimes nested in subdirs)
  for (const e of entries) {
    const full = path.join(dir, e);
    try {
      if (fs.statSync(full).isDirectory()) {
        const sub = fs.readdirSync(full);
        for (const s of sub) if (s.endsWith(".app")) return path.join(full, s);
      }
    } catch {
      // ignore
    }
  }
  return null;
}

async function extractFromDmg(
  dmgPath: string,
  onProgress?: ProgressFn,
): Promise<string | null> {
  onProgress?.("Mounting disk image…");
  const mount = await mountDmg(dmgPath);
  if (!mount) return null;
  try {
    onProgress?.("Locating app in image…");
    const appInMount = await findAppIn(mount.mountPoint);
    if (!appInMount) return null;
    // Copy out of the mount before detaching
    const stagePath = path.join(
      path.dirname(dmgPath),
      path.basename(appInMount),
    );
    onProgress?.("Copying app…");
    await runShell(`/bin/cp -R ${shq(appInMount)} ${shq(stagePath)}`);
    return stagePath;
  } finally {
    await mount.detach();
  }
}

async function extractFromZip(
  zipPath: string,
  workDir: string,
  onProgress?: ProgressFn,
): Promise<string | null> {
  onProgress?.("Unzipping…");
  const extractDir = path.join(workDir, "unzipped");
  fs.mkdirSync(extractDir, { recursive: true });
  await runShell(`/usr/bin/unzip -qq -o ${shq(zipPath)} -d ${shq(extractDir)}`);
  return findAppIn(extractDir);
}

async function clearQuarantine(appPath: string): Promise<void> {
  try {
    await runShell(`/usr/bin/xattr -cr ${shq(appPath)} 2>/dev/null`);
  } catch {
    // ignore
  }
}

async function verifySignature(appPath: string): Promise<boolean> {
  try {
    await runShell(
      `/usr/bin/codesign --verify --no-strict ${shq(appPath)} 2>/dev/null`,
    );
    return true;
  } catch {
    return false;
  }
}

async function swapApps(
  stagedAppPath: string,
  targetPath: string,
): Promise<ReplaceResult> {
  const backupPath = targetPath + ".mac-updater-backup";

  // Clean up any previous backup
  if (fs.existsSync(backupPath)) {
    try {
      fs.rmSync(backupPath, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }

  // Move old → backup (if exists)
  if (fs.existsSync(targetPath)) {
    try {
      await runShell(`/bin/mv ${shq(targetPath)} ${shq(backupPath)}`);
    } catch (e) {
      const msg = String(e);
      if (/permission denied|operation not permitted/i.test(msg)) {
        return { success: false, error: msg, needsAdmin: true };
      }
      return { success: false, error: msg };
    }
  }

  // Move staged → target
  try {
    await runShell(`/bin/mv ${shq(stagedAppPath)} ${shq(targetPath)}`);
  } catch (e) {
    // Try to roll back
    if (fs.existsSync(backupPath)) {
      try {
        await runShell(`/bin/mv ${shq(backupPath)} ${shq(targetPath)}`);
      } catch {
        // ignore
      }
    }
    const msg = String(e);
    return {
      success: false,
      error: msg,
      needsAdmin: /permission denied|operation not permitted/i.test(msg),
    };
  }

  // Strip quarantine & verify
  await clearQuarantine(targetPath);
  const ok = await verifySignature(targetPath);
  if (!ok) {
    // Rollback
    try {
      await runShell(`/bin/rm -rf ${shq(targetPath)}`);
      if (fs.existsSync(backupPath)) {
        await runShell(`/bin/mv ${shq(backupPath)} ${shq(targetPath)}`);
      }
    } catch {
      // ignore
    }
    return { success: false, error: "Code signature verification failed" };
  }

  // Success — remove backup
  if (fs.existsSync(backupPath)) {
    try {
      fs.rmSync(backupPath, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
  return { success: true };
}

async function swapWithAdmin(
  stagedAppPath: string,
  targetPath: string,
): Promise<ReplaceResult> {
  // Single admin prompt: backup → install → verify → cleanup
  const backupPath = targetPath + ".mac-updater-backup";
  const script = [
    `rm -rf ${shq(backupPath)}`,
    `if [ -d ${shq(targetPath)} ]; then mv ${shq(targetPath)} ${shq(backupPath)}; fi`,
    `mv ${shq(stagedAppPath)} ${shq(targetPath)}`,
    `xattr -cr ${shq(targetPath)} 2>/dev/null || true`,
    `rm -rf ${shq(backupPath)}`,
  ].join(" && ");
  try {
    // shq() would wrap `script` in single quotes, which collides with the outer
    // single-quoted `-e '...'` shell arg and breaks the AppleScript. escapeAS()
    // emits a properly escaped string literal for AppleScript's double-quoted
    // form, with no nesting hazard.
    await runShell(
      `osascript -e 'do shell script "${escapeAS(script)}" with administrator privileges with prompt "Mac Updater needs to replace the app in /Applications."'`,
    );
    return { success: true };
  } catch (e) {
    return { success: false, error: extractCmdError(e) };
  }
}

export interface InstallOptions {
  downloadUrl: string;
  targetAppPath: string;
  appName: string;
  onProgress?: ProgressFn;
}

export async function downloadAndInstall(
  opts: InstallOptions,
): Promise<ReplaceResult> {
  const { downloadUrl, targetAppPath, appName, onProgress } = opts;
  const workDir = await mkTempDir();

  try {
    // Step 1: download
    const filename = filenameFromUrl(downloadUrl);
    const downloadPath = path.join(workDir, filename);
    await downloadFile(downloadUrl, downloadPath, onProgress);

    // Step 2: extract
    const stagedApp = await extractApp(downloadPath, workDir, onProgress);
    if (!stagedApp) {
      const type = await detectArchive(downloadPath);
      if (type === "pkg") {
        // Defer to system installer with admin prompt.
        // The inner shell command is built with shq() (single-quote safe), then
        // the entire thing is escaped via escapeAS() for AppleScript's
        // double-quoted string literal — avoids quote nesting hazards.
        onProgress?.("Running pkg installer…");
        try {
          const installCmd = `installer -pkg ${shq(downloadPath)} -target /`;
          await runShell(
            `osascript -e 'do shell script "${escapeAS(installCmd)}" with administrator privileges with prompt "Mac Updater needs to run the package installer for ${escapeAS(appName)}."'`,
          );
          return { success: true };
        } catch (e) {
          return { success: false, error: extractCmdError(e) };
        }
      }
      return { success: false, error: "Could not extract app from download" };
    }

    // Step 3: quit running app
    onProgress?.("Quitting app…");
    await quitApp(appName);

    // Step 4: swap (try user-perms first, fall back to admin)
    onProgress?.("Installing…");
    let result = await swapApps(stagedApp, targetAppPath);
    if (!result.success && result.needsAdmin) {
      onProgress?.("Needs admin — requesting permission…");
      // Re-stage if necessary (the first attempt may have moved it)
      if (!fs.existsSync(stagedApp)) {
        return {
          success: false,
          error: "Staged app missing after permission failure",
        };
      }
      result = await swapWithAdmin(stagedApp, targetAppPath);
    }
    return result;
  } catch (e) {
    return { success: false, error: extractCmdError(e) };
  } finally {
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

function filenameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const base = path.basename(u.pathname) || "download";
    // Strip query, restrict to safe chars
    return base.replace(/[^A-Za-z0-9._-]/g, "_") || "download";
  } catch {
    return "download";
  }
}
