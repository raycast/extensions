import { isFolnaroError } from "./errors";
import type { TimeEntry } from "./types";
import type { StringKey } from "./text";

export interface MenuTimerData {
  entry: TimeEntry | null;
  name?: string;
}

export interface MenuState {
  /** The timer to show; always null while Folnaro is unreachable, so no stale clock keeps running. */
  entry: TimeEntry | null;
  name?: string;
  unavailable: boolean;
  /** Text of the single menu line that explains why nothing is shown. */
  unavailableKey: StringKey;
}

/**
 * What the "Running Timer" menu bar shows. A cached timer is only good while the last refresh
 * worked: after an error the cached value is dropped instead of drawn with a clock that goes on
 * counting for a timer nobody can confirm any more.
 */
export function menuState(data: MenuTimerData | undefined, error: unknown): MenuState {
  if (error) {
    const notApproved = isFolnaroError(error) && error.kind === "notApproved";
    return { entry: null, unavailable: true, unavailableKey: notApproved ? "menu.notApproved" : "menu.unavailable" };
  }
  return { entry: data?.entry ?? null, name: data?.name, unavailable: false, unavailableKey: "menu.unavailable" };
}
