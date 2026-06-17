import { showFailureToast } from "@raycast/utils";
import { spawnSync } from "child_process";
export interface DockLockDisplay {
  name: string;
  geometry: { x: number; y: number; width: number; height: number };
  dockVisible: boolean;
  dockMovable: boolean;
}

export interface DockLockStatus {
  dockControlMode: string;
  displayName: string;
  dockState: string;
}

export async function getDisplays(): Promise<DockLockDisplay[]> {
  const result = spawnSync("/Applications/DockLock Plus.app/Contents/MacOS/DockLock Plus", ["displays", "--json"], {
    encoding: "utf8",
  });

  if (result.status === 0 && result.stdout) {
    try {
      return JSON.parse(result.stdout);
    } catch (error) {
      await showFailureToast(error, { title: "Error parsing displays JSON" });
      return [];
    }
  } else {
    const errorMessage = result.stderr || "Unknown error";
    console.error(errorMessage);
    await showFailureToast(new Error(`Error fetching displays (exit code ${result.status}): ${errorMessage}`), {
      title: "Error fetching displays",
    });
    return [];
  }
}

export async function getStatus(): Promise<DockLockStatus | null> {
  const result = spawnSync("/Applications/DockLock Plus.app/Contents/MacOS/DockLock Plus", ["status", "--json"], {
    encoding: "utf8",
  });

  if (result.status === 0 && result.stdout) {
    try {
      return JSON.parse(result.stdout);
    } catch (error) {
      await showFailureToast(error, { title: "Error parsing status JSON" });
      return null;
    }
  } else {
    const errorMessage = result.stderr || "Unknown error";
    console.error(errorMessage);
    await showFailureToast(new Error(`Error fetching status (exit code ${result.status}): ${errorMessage}`), {
      title: "Error fetching status",
    });
    return null;
  }
}

export function isDockLockPlusInstalled(): boolean {
  const result = spawnSync("open", ["-Ra", "DockLock Plus"]);
  return result.status === 0;
}

export async function isDockMovable(): Promise<boolean> {
  try {
    const status = await getStatus();
    if (status === null) {
      return false;
    }
    const mode = status.dockControlMode;
    if (mode === "follows-mouse" || mode === "follows-window") {
      return false;
    }
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}
