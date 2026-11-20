import { boostsAnything, Intent } from "./intent";

export interface KeepAliveInput {
  restoreAfterRestart: boolean;
  running: boolean;
  /** The saved intent; `undefined` if never set. An explicit Off is saved as 1.0, so it is never undone. */
  wanted: Intent | undefined;
}

/** Whether the menu bar command should restart the helper. */
export function shouldRestart({ restoreAfterRestart, running, wanted }: KeepAliveInput): boolean {
  return restoreAfterRestart && !running && wanted !== undefined && boostsAnything(wanted);
}
