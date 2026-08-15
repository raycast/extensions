import { exec } from "child_process";
import util from "util";
const execPromise = util.promisify(exec);

export default execPromise;
