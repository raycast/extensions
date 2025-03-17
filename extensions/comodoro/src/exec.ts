import child_process = require("node:child_process");
import util = require("node:util");

export const run = util.promisify(child_process.exec);
