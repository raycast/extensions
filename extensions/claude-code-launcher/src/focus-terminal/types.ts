export type FocusResult =
  | { kind: "window" } // the exact window/tab hosting the session was focused
  | { kind: "app"; appName: string }; // only the hosting terminal app was brought to front

/** Focuses the existing window/tab hosting a session, identified by its tty. */
export interface FocusAdapter {
  name: string;
  /** Whether this adapter handles the terminal with the given executable path. */
  matches(command: string): boolean;
  /** Focus the window/tab attached to the tty. Returns false when the session cannot be found. */
  focusSession(ttyPath: string): Promise<boolean>;
}
