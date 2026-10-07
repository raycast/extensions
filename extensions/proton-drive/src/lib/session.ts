import { CliError } from "./cli";
import { clearLocalData } from "./files";

export function isSignedOut(error: unknown): boolean {
  return error instanceof CliError && error.signedOut;
}

let forgetting: Promise<void> | undefined;

/**
 * The CLI session ended outside the extension (`proton-drive auth logout`, expiry, another account):
 * delete everything cached locally, exactly as Log Out does, so no file names stay on display.
 */
export function forgetLocalData(): Promise<void> {
  forgetting ??= clearLocalData().catch(() => undefined);
  return forgetting;
}
