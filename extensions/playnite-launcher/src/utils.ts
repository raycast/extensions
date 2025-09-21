import { exec } from "node:child_process";
import { promisify } from "node:util";

export const removeBOM = (source: string) => source.replace(/^\uFEFF/, "");
export const execAsync = promisify(exec);
