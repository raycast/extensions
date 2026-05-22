import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface CommandExecutorOptions {
  readFile(path: string): Promise<string>;
  writeFile(path: string, contents: string): Promise<void>;
}

export type CommandExecutor = (
  command: string,
  args: string[],
  options?: CommandExecutorOptions,
) => Promise<string>;

export const defaultExecutor: CommandExecutor = async (command, args) => {
  const result = await execFileAsync(command, args, {
    maxBuffer: 10 * 1024 * 1024,
  });
  return result.stdout;
};

export const defaultExecutorOptions: CommandExecutorOptions = {
  readFile: (path: string) => readFile(path, "utf8"),
  writeFile,
};
