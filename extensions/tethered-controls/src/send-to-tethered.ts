import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const notificationScript = `function run(argv) {
  ObjC.import("Foundation");
  const center = $.NSDistributedNotificationCenter.defaultCenter;
  const info = $.NSDictionary.dictionaryWithObjectForKey($(argv[0]), $("url"));
  center.postNotificationNameObjectUserInfoDeliverImmediately($("com.Tumerit.Tethered.raycast.control"), undefined, info, true);
}`;

export async function sendToTethered(url: string): Promise<void> {
  await execFileAsync(
    "/usr/bin/osascript",
    ["-l", "JavaScript", "-e", notificationScript, url],
    {
      timeout: 10000,
    },
  );
}

export async function isTetheredRunning(): Promise<boolean> {
  const script = `function run() {
    ObjC.import("AppKit");
    return $.NSRunningApplication.runningApplicationsWithBundleIdentifier("com.Tumerit.Tethered").count > 0;
  }`;
  const { stdout } = await execFileAsync(
    "/usr/bin/osascript",
    ["-l", "JavaScript", "-e", script],
    {
      timeout: 10000,
    },
  );
  return stdout.trim() === "true";
}
