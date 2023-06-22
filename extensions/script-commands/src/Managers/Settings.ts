import { environment, getPreferenceValues } from "@raycast/api";

import { homedir } from "os";

import path from "path";

export class Settings {
  supportPath: string;
  folderPath: string;
  commandsFolderPath: string;
  databaseFile: string;
  repositoryCommandsFolderPath: string;
  imagesCommandsFolderPath: string;

  constructor() {
    this.supportPath = environment.supportPath;
    this.folderPath = getPreferenceValues().folderPath;
    this.commandsFolderPath = this.resolvePath(this.folderPath);
    this.databaseFile = path.join(this.supportPath, "ScriptCommandsStore.json");
    this.repositoryCommandsFolderPath = path.join(this.commandsFolderPath, "commands");
    this.imagesCommandsFolderPath = path.join(this.commandsFolderPath, "images");
  }

  private resolvePath(folder: string): string {
    if (folder.length > 0 && folder.startsWith("~")) {
      return path.join(homedir(), folder.slice(1));
    }

    return folder;
  }
}
