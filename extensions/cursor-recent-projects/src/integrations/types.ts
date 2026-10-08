import { LaunchOptions } from "raycast-cross-extension";

export interface CursorDirectoryContext {
  ruleContent: string;
  replace?: boolean;
}

export type LaunchContext = {
  cursorDirectory?: Partial<CursorDirectoryContext>;
  callbackLaunchOptions?: LaunchOptions;
};
