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
  await execFileAsync("/usr/bin/osascript", ["-l", "JavaScript", "-e", notificationScript, url], {
    timeout: 10000,
  });
}
