import { exec } from "child_process";
import { promisify } from "util";

type Input = {
  /**
   * CURL shell command to execute. Always use `--verbose` flag
   */
  command: string;
};

const execAsync = promisify(exec);

export default async function (input: Input) {
  return execAsync(input.command);
}
