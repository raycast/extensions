import { environment, LocalStorage } from "@raycast/api";
import { exec, spawn } from "child_process";
import {
  access,
  mkdir,
  readFile,
  symlink,
  unlink,
  writeFile,
} from "fs/promises";
import * as os from "os";
import * as path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);
const COOKIE_KEY = "session_cookie";

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

// ─── Auth browser ──────────────────────────────────────────────────────────

// Opens an isolated WKWebView window via a temporary .app bundle so macOS
// grants it proper window-server access. Cookie is returned through a temp file.
export async function launchAuthBrowser(signInUrl: string): Promise<string> {
  const binaryPath = await ensureBinary();
  const sessionId = Date.now().toString(36);
  const appBundle = await ensureAppBundle(binaryPath, sessionId);
  const cookieFile = path.join(os.tmpdir(), `cedarstalk-cookie-${sessionId}.txt`);

  await unlink(cookieFile).catch(() => {});

  // Use spawn (not execAsync) so the SAML URL isn't shell-interpreted
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(
      "open",
      ["-n", "-W", appBundle, "--args", signInUrl, cookieFile],
      {
        stdio: "ignore",
      },
    );
    proc.on("close", (code) => {
      // open -W exits 0 whether the app succeeded or cancelled;
      // we detect success by whether the cookie file was written
      resolve();
    });
    proc.on("error", reject);
  });

  const cookie = await readFile(cookieFile, "utf-8")
    .then((s) => s.trim())
    .catch(() => "");
  await unlink(cookieFile).catch(() => {});
  // Clean up the ephemeral app bundle
  await execAsync(`rm -rf "${appBundle}"`).catch(() => {});

  if (!cookie) throw new Error("Sign-in cancelled");
  return cookie;
}

async function ensureBinary(): Promise<string> {
  if (!environment.isDevelopment) {
    // Production: use the pre-compiled universal binary bundled in assets.
    // Re-sign ad-hoc if the signature was stripped (e.g. by Raycast's distribution pipeline).
    const binaryPath = path.join(environment.assetsPath, "auth-browser-bin");
    const valid = await execAsync(`codesign --verify "${binaryPath}"`).then(() => true).catch(() => false);
    if (!valid) await execAsync(`codesign --sign - --force "${binaryPath}"`);
    return binaryPath;
  }

  // Development: compile from source so changes to the Swift file are picked up
  const swiftSrc = path.join(environment.assetsPath, "auth-browser.swift");
  const binaryPath = path.join(environment.supportPath, "auth-browser");

  try {
    await access(binaryPath);
    return binaryPath;
  } catch {
    await mkdir(environment.supportPath, { recursive: true });
    // Compile with optimisations to avoid debug-mode assertion traps
    await execAsync(`swiftc -O "${swiftSrc}" -o "${binaryPath}"`);
    // Ad-hoc sign so macOS treats it as a trusted binary
    await execAsync(`codesign --sign - --force "${binaryPath}"`);
    return binaryPath;
  }
}

async function ensureAppBundle(binaryPath: string, sessionId: string): Promise<string> {
  const appDir = path.join(os.tmpdir(), `CedarStalkAuth-${sessionId}.app`);
  const macosDir = path.join(appDir, "Contents", "MacOS");
  const plistPath = path.join(appDir, "Contents", "Info.plist");
  const bundledBinary = path.join(macosDir, "CedarStalkAuth");

  await mkdir(macosDir, { recursive: true });

  // Always recreate the symlink so it tracks the current binary path
  await unlink(bundledBinary).catch(() => {});
  await symlink(binaryPath, bundledBinary);

  await writeFile(
    plistPath,
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundlePackageType</key><string>APPL</string>
	<key>CFBundleExecutable</key><string>CedarStalkAuth</string>
	<key>CFBundleIdentifier</key><string>sh.dunkirk.cedarstalk.auth</string>
	<key>CFBundleName</key><string>CedarStalk Auth</string>
	<key>NSPrincipalClass</key><string>NSApplication</string>
	<key>NSHighResolutionCapable</key><true/>
	<key>LSMinimumSystemVersion</key><string>13.0</string>
</dict>
</plist>`,
  );

  return appDir;
}
