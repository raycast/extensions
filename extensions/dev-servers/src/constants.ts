import { Application } from "@raycast/api";

// Fallback terminal when the user hasn't set the `terminalApp` preference.
// Shared by both commands so the default can't drift between them.
export const DEFAULT_TERMINAL: Application = {
  name: "Terminal",
  path: "/System/Applications/Utilities/Terminal.app",
  bundleId: "com.apple.Terminal",
};
