import util from "util";
import { exec } from "node:child_process";

export const execAsync = util.promisify(exec);
