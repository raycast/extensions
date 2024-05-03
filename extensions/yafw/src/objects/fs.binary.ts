import { execSync } from "child_process";
import { Binary, Folder } from "../abstractions";

export class FsBinary implements Binary {
  constructor(
    private readonly folders: Folder[],
    private readonly fileName: string,
  ) {}

  path: Binary["path"] = () => {
    return this.folders.map((folder) => folder.path()).join(":");
  };

  exists: Binary["exists"] = () => {
    try {
      execSync(`zsh -l -c 'PATH=${this.path()} which ${this.fileName}'`);
      return true;
    } catch (err) {
      return false;
    }
  };

  command: Binary["command"] = (args) => `zsh -l -c 'PATH=${this.path()} ${this.fileName} ${args}'`;
}
