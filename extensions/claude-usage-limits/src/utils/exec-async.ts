import { execFile } from "child_process";
import { promisify } from "util";

export const execAsync = promisify(execFile);
