import * as util from "util";
import { exec } from "child_process";

export const execAsync = util.promisify(exec);
