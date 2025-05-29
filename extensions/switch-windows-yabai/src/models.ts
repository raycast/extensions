import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import * as os from "node:os";

export interface YabaiWindow {
  id: number;
  pid: number;
  app: string;
  title: string;
  space: number;
  frame?: { x: number; y: number; w: number; h: number };
  role?: string;
  subrole?: string;
  "root-window"?: boolean;
  display?: number;
  level?: number;
  focused?: boolean;
  "is-native-fullscreen"?: boolean;
}

export enum SortMethod {
  USAGE = "usage",
  RECENTLY_USED = "recently_used",
}

export interface YabaiSpace {
  index: number;
  windows: YabaiWindow[];
}

export const YABAI = existsSync("/opt/homebrew/bin/yabai")
  ? "/opt/homebrew/bin/yabai"
  : existsSync("/usr/local/bin/yabai")
    ? "/usr/local/bin/yabai"
    : execSync("which yabai").toString().trim();

export const ENV = {
  USER: os.userInfo().username,
  HOME: os.userInfo().homedir,
};
