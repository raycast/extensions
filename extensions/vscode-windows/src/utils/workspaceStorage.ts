import { readdirSync, readFileSync } from "fs";
import os from "os";
import { basename, join } from "path";
import { WorkspaceType } from "./workspaceStorage.d";

interface PlatformStrategy {
  match(platform: string): boolean;
  getAppData(): string;
}

class WindowsStrategy implements PlatformStrategy {
  match(platform: string) {
    return platform.includes("win32");
  }

  getAppData() {
    return process.env.APPDATA ?? join(os.homedir(), "AppData", "Roaming");
  }
}

class MacStrategy implements PlatformStrategy {
  match(platform: string) {
    return platform.includes("darwin");
  }

  getAppData() {
    return join(os.homedir(), "Library", "Application Support");
  }
}

class LinuxStrategy implements PlatformStrategy {
  match(platform: string) {
    return platform.includes("linux");
  }

  getAppData() {
    return join(os.homedir(), ".config");
  }
}

const strategies: PlatformStrategy[] = [new WindowsStrategy(), new MacStrategy(), new LinuxStrategy()];

export default function Workspaces(): WorkspaceType[] {
  const platform = String(process.platform);
  const strategy = strategies.find((s) => s.match(platform)) ?? new LinuxStrategy();
  const appDataPath = strategy?.getAppData();
  const pathWorkspace = join(appDataPath, "Code", "User", "workspaceStorage");
  let workspacesDir: string[];

  try {
    workspacesDir = readdirSync(pathWorkspace);
  } catch {
    return [];
  }

  const workspaces = [];

  for (const dirName of workspacesDir) {
    const workspaceDetailsPath = join(pathWorkspace, dirName, "workspace.json");
    try {
      const workspaceDetail = readFileSync(workspaceDetailsPath);
      const jsonDetail = JSON.parse(String(workspaceDetail))?.folder;
      if (!jsonDetail) continue;

      const path = decodeURIComponent(jsonDetail.replace("file:///", ""));

      const nameWorkspace = basename(path);

      workspaces.push({
        name: nameWorkspace,
        path: path,
      });
    } catch {
      continue;
    }
  }

  const workspacesFiltered: WorkspaceType[] = [];

  workspaces.forEach((obj) => {
    if (!workspacesFiltered.some((obj2) => obj.path.includes(obj2.path))) {
      workspacesFiltered.push(obj);
    }
  });

  return workspacesFiltered;
}
