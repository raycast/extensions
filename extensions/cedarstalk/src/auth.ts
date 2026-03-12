import { environment, LocalStorage } from "@raycast/api";
import { exec, spawn } from "child_process";
import { access, mkdir, readFile, symlink, unlink, writeFile } from "fs/promises";
import * as os from "os";
import * as path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);
const COOKIE_KEY = "session_cookie";

// Use /tmp directly (not os.tmpdir) so paths match the Swift binary's hardcoded CONFIG_FILE.
// os.tmpdir() under Raycast returns /var/folders/…/T which differs from /tmp.
const CONFIG_FILE = "/tmp/cedarstalk-auth-config.json";
const COOKIE_FILE = "/tmp/cedarstalk-cookie.txt";
const LOG_FILE = "/tmp/cedarstalk-auth.log";

// ─── Cookie storage ────────────────────────────────────────────────────────

export async function getStoredCookie(): Promise<string | undefined> {
  return LocalStorage.getItem<string>(COOKIE_KEY);
}

export async function storeCookie(cookie: string): Promise<void> {
  await LocalStorage.setItem(COOKIE_KEY, cookie);
}

export async function clearCookie(): Promise<void> {
  await LocalStorage.removeItem(COOKIE_KEY);
}

// If Raycast closed mid-auth but the Swift app finished and wrote the cookie,
// pick it up on the next open and delete it from disk.
export async function drainPendingCookie(): Promise<string | undefined> {
  try {
    const cookie = (await readFile(COOKIE_FILE, "utf-8")).trim();
    await unlink(COOKIE_FILE).catch(() => {});
    if (cookie) return cookie;
  } catch {
    // file doesn't exist — nothing pending
  }
}

// ─── Auth browser ──────────────────────────────────────────────────────────

// Opens an isolated WKWebView window via a temporary .app bundle so macOS
// grants it proper window-server access. Config is passed via a JSON file
// (not --args) to avoid Launch Services caching stale arguments.
export async function launchAuthBrowser(signInUrl: string): Promise<string> {
  const binaryPath = await ensureBinary();
  const appBundle = await ensureAppBundle(binaryPath);

  // Write config before launch — Swift reads this instead of using --args
  await unlink(COOKIE_FILE).catch(() => {});
  await unlink(LOG_FILE).catch(() => {});
  await writeFile(CONFIG_FILE, JSON.stringify({ signInUrl, cookieFile: COOKIE_FILE, logFile: LOG_FILE }));

  await new Promise<void>((resolve, reject) => {
    const proc = spawn("open", ["-n", "-W", appBundle], { stdio: "ignore" });
    proc.on("close", () => resolve());
    proc.on("error", reject);
  });

  const log = await readFile(LOG_FILE, "utf-8").catch(() => "(no log)");
  await unlink(LOG_FILE).catch(() => {});

  const cookie = await readFile(COOKIE_FILE, "utf-8").then((s) => s.trim()).catch(() => "");
  await unlink(COOKIE_FILE).catch(() => {});
  await unlink(CONFIG_FILE).catch(() => {});

  if (!cookie) throw new Error(`Sign-in cancelled. Log:\n${log}`);
  return cookie;
}

async function ensureBinary(): Promise<string> {
  if (!environment.isDevelopment) {
    const binaryPath = path.join(environment.assetsPath, "auth-browser-bin");
    const valid = await execAsync(`codesign --verify "${binaryPath}"`).then(() => true).catch(() => false);
    if (!valid) await execAsync(`codesign --sign - --force "${binaryPath}"`);
    return binaryPath;
  }

  const swiftSrc = path.join(environment.assetsPath, "auth-browser.swift");
  const binaryPath = path.join(environment.supportPath, "auth-browser");

  try {
    await access(binaryPath);
    return binaryPath;
  } catch {
    await mkdir(environment.supportPath, { recursive: true });
    await execAsync(`swiftc -O "${swiftSrc}" -o "${binaryPath}"`);
    await execAsync(`codesign --sign - --force "${binaryPath}"`);
    return binaryPath;
  }
}

async function ensureAppBundle(binaryPath: string): Promise<string> {
  const appDir = path.join(os.tmpdir(), "CedarStalkAuth.app");
  const macosDir = path.join(appDir, "Contents", "MacOS");
  const plistPath = path.join(appDir, "Contents", "Info.plist");
  const bundledBinary = path.join(macosDir, "CedarStalkAuth");

  // Always recreate fresh so LS sees a new bundle
  await execAsync(`rm -rf "${appDir}"`).catch(() => {});
  await mkdir(macosDir, { recursive: true });
  await symlink(binaryPath, bundledBinary);

  await writeFile(plistPath, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>CFBundlePackageType</key><string>APPL</string>
\t<key>CFBundleExecutable</key><string>CedarStalkAuth</string>
\t<key>CFBundleIdentifier</key><string>sh.dunkirk.cedarstalk.auth</string>
\t<key>CFBundleName</key><string>CedarStalk Auth</string>
\t<key>NSPrincipalClass</key><string>NSApplication</string>
\t<key>NSHighResolutionCapable</key><true/>
\t<key>LSMinimumSystemVersion</key><string>13.0</string>
</dict>
</plist>`);

  return appDir;
}
