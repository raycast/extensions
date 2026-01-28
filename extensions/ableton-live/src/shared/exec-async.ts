import { exec } from "child_process";
import { promisify } from "util";

/**
 * Spawns a shell then executes the command within that shell, buffering any generated output.
 */
export const execAsync = promisify(exec);

// https://github.com/raycast/extensions/blob/main/extensions/xcode/src/shared/exec-async.ts
