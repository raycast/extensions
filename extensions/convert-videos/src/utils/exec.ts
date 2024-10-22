import util from "util";
import { exec } from "child_process";

export const execPromise = util.promisify(exec);
