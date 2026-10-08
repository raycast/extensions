export type Frame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MenuBarCategory =
  | "app:generic"
  | "input:abc"
  | "input:generic"
  | "system:accessibility"
  | "system:airdrop"
  | "system:battery"
  | "system:bluetooth"
  | "system:clock"
  | "system:control-center"
  | "system:focus"
  | "system:now-playing"
  | "system:screen-mirroring"
  | "system:siri"
  | "system:sound"
  | "system:spotlight"
  | "system:stage-manager"
  | "system:unknown"
  | "system:vpn"
  | "system:wifi";

export type MenuBarItem = {
  id: string;
  title?: string;
  category?: MenuBarCategory | string;
  openStrategy?: "ax" | "click" | string;
  isObscured?: boolean;
  ownerPid: number;
  bundleId?: string;
  processName?: string;
  appPath?: string;
  iconPath?: string;
  frame?: Frame;
  actions: string[];
  source: string;
};

export type MenuBarItemHint = {
  ownerPid: number;
  bundleId?: string;
  processName?: string;
  title?: string;
  category: string;
  source: string;
  frame?: Frame;
};

export type HelperError = {
  code?: string;
  message?: string;
  recoverySuggestion?: string;
};
