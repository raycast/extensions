/**
 * Promisified Node.js process execution helpers.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

/** Promisified `execFile` for running ffmpeg and other CLI tools. */
export const execFileAsync = promisify(execFile);
