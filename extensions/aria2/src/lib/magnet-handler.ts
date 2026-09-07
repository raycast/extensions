import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const HANDLER_BUNDLE_ID = "com.peterrauscher.aria2-magnet-handler";
export const HANDLER_APP_NAME = "Aria2 Magnet Handler";
export const HANDLER_APP_PATH = join(homedir(), "Applications", `${HANDLER_APP_NAME}.app`);
export const HANDLER_CONFIG_PATH = join(homedir(), "Library/Application Support/aria2-raycast/handler.json");

const APPLESCRIPT = `
on addTorrent(theURI)
  set helper to POSIX path of (path to me) & "Contents/Resources/add-magnet.py"
  try
    do shell script "/usr/bin/python3 " & quoted form of helper & " " & quoted form of theURI
    display notification "Added to aria2" with title "Aria2 Magnet Handler"
  on error errMsg
    display notification errMsg with title "Aria2 Magnet Handler"
  end try
end addTorrent

on open location theURI
  addTorrent(theURI)
end open location

on open theFiles
  repeat with f in theFiles
    addTorrent(POSIX path of f)
  end repeat
end open

on run argv
  if (count of argv) > 0 then
    addTorrent(item 1 of argv)
  end if
end run
`;

const PYTHON_HELPER = `#!/usr/bin/env python3
import json
import os
import sys
import urllib.request
import urllib.error

CONFIG = os.path.expanduser("~/Library/Application Support/aria2-raycast/handler.json")


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("missing magnet URI or torrent path")
    source = sys.argv[1]
    with open(CONFIG, encoding="utf-8") as handle:
        cfg = json.load(handle)
    token = cfg.get("rpcSecret") or ""
    params: list = []
    if token:
        params.append("token:" + token)
    options = {}
    download_dir = cfg.get("downloadDir")
    if download_dir:
        options["dir"] = download_dir
    if os.path.isfile(source):
        import base64
        with open(source, "rb") as torrent:
            payload = base64.b64encode(torrent.read()).decode("ascii")
        params.append(payload)
        params.append([])
        if options:
            params.append(options)
        method = "aria2.addTorrent"
    else:
        params.append([source])
        if options:
            params.append(options)
        method = "aria2.addUri"
    body = json.dumps({"jsonrpc": "2.0", "id": "magnet-handler", "method": method, "params": params}).encode()
    req = urllib.request.Request(cfg["rpcUrl"], data=body, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode())
    except urllib.error.URLError as exc:
        raise SystemExit(f"aria2 RPC failed: {exc}") from exc
    if result.get("error"):
        raise SystemExit(result["error"].get("message", str(result["error"])))


if __name__ == "__main__":
    main()
`;

export async function writeHandlerConfig(config: {
  rpcUrl: string;
  rpcSecret: string;
  downloadDir: string;
}): Promise<void> {
  await mkdir(join(homedir(), "Library/Application Support/aria2-raycast"), { recursive: true });
  await writeFile(HANDLER_CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function handlerAppExists(): boolean {
  return existsSync(HANDLER_APP_PATH);
}

export async function currentMagnetHandler(): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("/usr/bin/swift", [
      "-e",
      'import Foundation; import CoreServices; let v = LSCopyDefaultHandlerForURLScheme("magnet" as CFString)?.takeRetainedValue() as String?; print(v ?? "")',
    ]);
    const id = stdout.trim();
    return id || undefined;
  } catch {
    return undefined;
  }
}

export async function installMagnetHandler(config: {
  rpcUrl: string;
  rpcSecret: string;
  downloadDir: string;
}): Promise<void> {
  await writeHandlerConfig(config);
  await mkdir(join(homedir(), "Applications"), { recursive: true });
  await rm(HANDLER_APP_PATH, { recursive: true, force: true });

  const scriptPath = join(homedir(), "Library/Application Support/aria2-raycast/handler.applescript");
  await writeFile(scriptPath, APPLESCRIPT);
  await execFileAsync("/usr/bin/osacompile", ["-o", HANDLER_APP_PATH, scriptPath]);

  const resources = join(HANDLER_APP_PATH, "Contents/Resources");
  await mkdir(resources, { recursive: true });
  const helperPath = join(resources, "add-magnet.py");
  await writeFile(helperPath, PYTHON_HELPER);
  await chmod(helperPath, 0o755);

  const plist = join(HANDLER_APP_PATH, "Contents/Info.plist");
  await replaceOrInsertPlist(plist, "CFBundleIdentifier", "string", HANDLER_BUNDLE_ID);
  await replaceOrInsertPlist(plist, "CFBundleName", "string", HANDLER_APP_NAME);
  await replaceOrInsertPlist(plist, "CFBundleDisplayName", "string", HANDLER_APP_NAME);
  await replaceOrInsertPlist(plist, "LSUIElement", "bool", "true");

  const urlTypes = JSON.stringify([
    {
      CFBundleURLName: "BitTorrent Magnet",
      CFBundleURLSchemes: ["magnet"],
    },
  ]);
  await replaceOrInsertPlist(plist, "CFBundleURLTypes", "json", urlTypes);

  const documentTypes = JSON.stringify([
    {
      CFBundleTypeName: "BitTorrent Torrent File",
      CFBundleTypeRole: "Viewer",
      LSHandlerRank: "Owner",
      LSItemContentTypes: ["org.bittorrent.torrent"],
      CFBundleTypeExtensions: ["torrent"],
    },
  ]);
  await replaceOrInsertPlist(plist, "CFBundleDocumentTypes", "json", documentTypes);

  const lsregister =
    "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister";
  if (existsSync(lsregister)) {
    await execFileAsync(lsregister, ["-f", HANDLER_APP_PATH]);
  }

  await execFileAsync("/usr/bin/swift", [
    "-e",
    `import Foundation; import CoreServices; LSSetDefaultHandlerForURLScheme("magnet" as CFString, "${HANDLER_BUNDLE_ID}" as CFString)`,
  ]);
}

export async function uninstallMagnetHandler(): Promise<void> {
  await rm(HANDLER_APP_PATH, { recursive: true, force: true });
}

async function replaceOrInsertPlist(
  plist: string,
  key: string,
  type: "json" | "string" | "bool",
  value: string,
): Promise<void> {
  try {
    await execFileAsync("/usr/bin/plutil", ["-replace", key, `-${type}`, value, plist]);
  } catch {
    await execFileAsync("/usr/bin/plutil", ["-insert", key, `-${type}`, value, plist]);
  }
}
