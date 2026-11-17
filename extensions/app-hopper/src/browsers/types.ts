import type { WindowState } from "../helpers/window-utils";
import type { BrowserProcessIdentity } from "./browser-process";

export interface BrowserConfig {
  id: string;
  appName: string;
  appPath?: string;
  engine: "chromium" | "firefox" | "webkit";
}

export interface BrowserTab {
  id: string;
  title: string;
  url: string;
}

export interface BrowserWindow extends WindowState {
  id: string;
  /** Native identity retained when the companion supplies a different window ID. */
  nativeWindowId?: string;
  title: string;
  tabs: BrowserTab[];
  space?: number;
  /** Missing tab controls are unknown, not an empty or single-tab window. */
  tabListUnavailable?: boolean;
  /** Actual active-tab URL from the companion, or native address-bar evidence when tabs are unavailable. */
  activeTabUrl?: string;
  browserProcess?: BrowserProcessIdentity;
  isLastFocused?: boolean;
  focusRevision?: number;
  /** Companion focus remained unchanged across the native scan. */
  focusVerified?: boolean;
  /** Unresolved native observation that may describe one of these companion windows. */
  possibleDuplicateOf?: string[];
}

export interface BrowserSummary {
  /** A lower bound when windowCountUncertain is true. */
  windows: number;
  tabs?: number;
  windowCountUncertain?: boolean;
}
