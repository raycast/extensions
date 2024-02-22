import { execFile } from "child_process";
import util from "util";

export const execFilePromis = util.promisify(execFile);
