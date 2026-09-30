import { LaunchOptions } from "raycast-cross-extension";

export interface KiroDirectoryContext {
  ruleContent: string;
  replace?: boolean;
}

export type LaunchContext = {
  kiroDirectory?: Partial<KiroDirectoryContext>;
  callbackLaunchOptions?: LaunchOptions;
};
