import { execFileSync } from "child_process";
import { existsSync } from "fs";
import { resolveGrantedPath } from "./assume";

function isOnPath(command: string): boolean {
  try {
    execFileSync("which", [command], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** Granted provides both the `granted`/`assumego` binaries and the `assume` shell alias this extension relies on. */
export function isGrantedInstalled(): boolean {
  return existsSync(resolveGrantedPath()) || isOnPath("granted");
}

/** Not strictly required by this extension, but Granted itself recommends it be installed. */
export function isAwsCliInstalled(): boolean {
  return isOnPath("aws");
}
