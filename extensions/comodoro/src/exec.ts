import child_process = require("node:child_process");
import util = require("node:util");

export const run: any = util.promisify(child_process.exec);

export const PATH = "/usr/bin:/bin:/usr/sbin:/opt/homebrew/bin:/opt/homebrew/sbin";
