import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function flushDns(
  platform: NodeJS.Platform = process.platform,
): Promise<void> {
  if (platform === "win32") {
    await execFileAsync("ipconfig.exe", ["/flushdns"], {
      windowsHide: true,
      timeout: 15000,
    });
    return;
  }
  if (platform === "darwin") {
    const command =
      "/usr/bin/dscacheutil -flushcache && /usr/bin/killall -HUP mDNSResponder";
    await execFileAsync(
      "/usr/bin/osascript",
      ["-e", `do shell script "${command}" with administrator privileges`],
      {
        timeout: 120000,
      },
    );
    return;
  }
  throw new Error("DNS cache flushing is supported only on macOS and Windows.");
}
