import type { Repository } from "./types";
import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

export class CodeManager {
  private clonePath: string;
  private editorCommand: string;

  public constructor(clonePath: string, editorCommand: string) {
    this.clonePath = clonePath.replace("~", homedir());
    this.editorCommand = editorCommand;
  }

  private execAndThrow(command: string) {
    exec(command, (error, stdout, stderr) => {
      if (error) throw Error(`Code: ${error.code}: ${error.message.trim()}. ${stdout.trim()} ${stderr.trim()}`);
    });
  }

  public cloneAndCode(repository: Repository) {
    const clonePath = `${this.clonePath}/${repository.owner}/${repository.name}`;
    if (!existsSync(clonePath)) this.execAndThrow(`git clone ${repository.cloneUrl} ${clonePath}`);
    this.execAndThrow(`'${this.editorCommand}' ${clonePath}`);
  }
}
