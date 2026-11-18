import { execFile } from "child_process";
import util from "util";

export const execFilePromise = util.promisify(execFile);
