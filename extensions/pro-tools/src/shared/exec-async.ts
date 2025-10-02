import { exec, ExecOptions } from "child_process";
import { promisify } from "util";

export const execAsync = promisify(exec);

// Default options with increased maxBuffer
export const defaultExecOptions: ExecOptions = {
  maxBuffer: 5 * 1024 * 1024, // 5MB buffer by default
};
