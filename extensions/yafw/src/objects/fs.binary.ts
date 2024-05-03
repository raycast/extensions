import { execSync } from "child_process";
import { Binary } from "../abstractions";

export class FsBinary implements Binary {
  constructor(
    /**
     * column separated path to folders.
     * @example '/bin:/homebrew/bin'
     */
    private readonly foldersPath: string,
    private readonly fileName: string,
  ) {}

  path: Binary["path"] = () => {
    return this.foldersPath;
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
