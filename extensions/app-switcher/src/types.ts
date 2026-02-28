export interface RunningAppWindow {
  title: string;
  minimized: boolean;
  index: number;
  windowNumber?: number;
}

export interface RunningApp {
  name: string;
  bundleId: string;
  frontmost: boolean;
  appPath: string;
  windows: RunningAppWindow[];
}

export interface AppGridItem {
  id: string;
  appName: string;
  bundleId: string;
  appPath: string;
  windowTitle?: string;
  windowIndex: number;
  windowNumber?: number;
  minimized: boolean;
  hasWindows: boolean;
  frontmost: boolean;
}
