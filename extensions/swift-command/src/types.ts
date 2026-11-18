import { Application } from "@raycast/api";

export interface Terminal {
  application: Application;
  supportInput: boolean; // Whether the terminal supports command input via AppleScript
  key: string; // Shortcut key identifier
  name: string; // Display name
}

export interface TerminalConfig {
  path: string;
  supportInput: boolean;
  key: string;
  name: string;
}
