import { useEffect, useState } from "react";
import { CliError } from "./cli";
import { showError } from "./errors";
import { clearLocalData } from "./files";

export function isSignedOut(error: unknown): boolean {
  return error instanceof CliError && error.signedOut;
}

/**
 * Signed-out state shared by every view of the command: once one view learns the session is gone,
 * all of them, including those further back in the navigation stack, stop showing Drive content.
 */
let signedOut = false;
const listeners = new Set<() => void>();

export function onSignedOut(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSignedOut(): boolean {
  const [value, setValue] = useState(signedOut);
  useEffect(() => onSignedOut(() => setValue(true)), []);
  return value;
}

let forgetting: Promise<void> | undefined;

/**
 * Deletes everything cached locally, as Log Out does. Concurrent calls share one deletion; a failed
 * deletion is reported to the caller and the next call tries again.
 */
export function forgetLocalData(): Promise<void> {
  forgetting ??= clearLocalData().finally(() => {
    forgetting = undefined;
  });
  return forgetting;
}

/**
 * The CLI session ended outside the extension (`proton-drive auth logout`, expiry, another account):
 * hide Drive content everywhere, then delete local data, saying so if that fails.
 */
export async function handleSignedOut(): Promise<void> {
  if (!signedOut) {
    signedOut = true;
    listeners.forEach((listener) => listener());
  }
  await forgetLocalData().catch((error) => showError(error, "Could not delete local Proton Drive data"));
}
