// === Window data models ===

export interface WindowInfo {
  windowId: number;
  appBundleId: string;
  appName: string;
  windowTitle: string;
  spaceIds: number[];
  x: number;
  y: number;
  width: number;
  height: number;
  isRegularApp: boolean; // true = foreground app, false = background/agent
}

export interface WindowFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GroupWindow {
  bundleId: string; // e.g. "com.brave.Browser"
  titleMatch: string; // substring match on window title
  appName: string; // display name for UI, e.g. "Brave Browser"
  windowId?: number; // CGWindowID — ephemeral, best-effort match for current session
  frame?: WindowFrame; // saved window position/size for layout restore
  displayId?: string; // "Main" or UUID — which monitor the window was on
}

// === Group data models ===

export interface Group {
  id: string;
  name: string;
  windows: GroupWindow[];
  restoreLayout?: boolean; // opt-in per group: restore window positions on summon
  relaunchApps?: boolean; // opt-in per group: offer to relaunch closed apps on summon
}

// === Display info ===

export interface DisplayBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DisplayInfo {
  displayId: string;
  displayName: string;
  bounds: DisplayBounds;
}

// === Storage schema ===

export interface StorageData {
  version: 6;
  groups: Group[];
}
