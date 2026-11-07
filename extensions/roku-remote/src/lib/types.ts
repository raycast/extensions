export interface RokuDevice {
  id: string;
  name: string;
  host: string;
  model?: string;
  softwareVersion?: string;
  isTv?: boolean;
  powerMode?: string;
  controlMode?: string;
  macs?: string[];
  capabilities: {
    volume?: boolean;
    power?: boolean;
    findRemote?: boolean;
  };
}

export interface RokuApp {
  id: string;
  name: string;
  type?: string;
  version?: string;
}

export interface RokuMediaPlayer {
  /** play, pause, buffer, open, stop, close, none, startup, … */
  state: string;
  error?: boolean;
  appId?: string;
  appName?: string;
  positionMs?: number;
  durationMs?: number;
  isLive?: boolean;
}
