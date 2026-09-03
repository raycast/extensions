import { environment } from "@raycast/api";
import { homedir } from "node:os";
import { join } from "node:path";
import { HelperPaths } from "./helper-lifecycle";

export function extensionPaths(): HelperPaths & { packagedExecutable: string } {
  const support = join(homedir(), "Library", "Application Support", "MouseScrollPerDevice");
  const label = "com.brandon.mouse-scroll-per-device.helper";
  return {
    packagedExecutable: join(environment.assetsPath, "bin", "mouse-scroll-helper"),
    installedExecutable: join(support, "bin", "mouse-scroll-helper"),
    config: join(support, "profiles.json"),
    state: join(support, "runtime.json"),
    permissionMarker: join(support, "permission-requested"),
    launchAgent: join(homedir(), "Library", "LaunchAgents", `${label}.plist`),
    label,
    stdoutLog: join(support, "logs", "helper.stdout.log"),
    stderrLog: join(support, "logs", "helper.stderr.log"),
  };
}
