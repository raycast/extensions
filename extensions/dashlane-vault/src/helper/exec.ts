import { exec } from "child_process";
import util from "util";

export const execPromise = util.promisify(exec);
