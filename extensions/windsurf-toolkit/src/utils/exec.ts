import { execFile } from "child_process";
import { promisify } from "util";

export const execFilePromise = promisify(execFile);
