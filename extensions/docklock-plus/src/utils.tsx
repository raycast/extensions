import { execSync } from "child_process";

interface DisplayDriver {
  _name?: string;
  spdisplays_connection_type?: string;
}

interface SPDisplayData {
  SPDisplaysDataType: Array<{
    spdisplays_ndrvs?: DisplayDriver[];
  }>;
}

export async function getDisplayNames(): Promise<string[]> {
  try {
    const stdout = execSync("/usr/sbin/system_profiler SPDisplaysDataType -json", { encoding: "utf8" });
    const data = JSON.parse(stdout) as SPDisplayData;
    const names: string[] = [];
    data.SPDisplaysDataType.forEach((gpu) => {
      (gpu.spdisplays_ndrvs ?? []).forEach((drv) => {
        if (drv.spdisplays_connection_type === "spdisplays_internal") {
          names.push("Built-in Retina Display");
        } else if (drv._name) {
          names.push(drv._name);
        }
      });
    });
    return Array.from(new Set(names));
  } catch (error) {
    await showFailureToast(error, { title: "Error fetching display names" });
    return [];
  }
}

export function isDockLockPlusInstalled(): boolean {
  try {
    execSync('open -Ra "DockLock Plus"');
    return true;
  } catch {
    return false;
  }
}
