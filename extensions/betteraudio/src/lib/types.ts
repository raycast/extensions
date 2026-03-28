export interface CLIDeviceInfo {
  uid: string;
  name: string;
  isInput: boolean;
  isOutput: boolean;
  isDefault: boolean;
  volume?: number | null;
  isMuted?: boolean | null;
  sampleRate?: number | null;
  transportType?: string | null;
}

export interface CLIAppInfo {
  id: string;
  name: string;
  bundleID?: string | null;
  volume: number;
  isMuted: boolean;
  deviceUID?: string | null;
  deviceName?: string | null;
  eqPreset?: string | null;
  balance?: number | null;
}

export interface CLIProfileInfo {
  id: string;
  name: string;
  appCount: number;
}

export interface CLIMediaInfo {
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  player?: string | null;
  isPlaying: boolean;
  position?: number | null;
  duration?: number | null;
  volume?: number | null;
}

export interface CLIBluetoothInfo {
  name: string;
  batteryLevel?: number | null;
  isConnected: boolean;
}

export interface CLIStatusInfo {
  version: string;
  isRunning: boolean;
  outputDevice?: CLIDeviceInfo | null;
  inputDevice?: CLIDeviceInfo | null;
  outputVolume: number;
  isMuted: boolean;
  isSilentMode: boolean;
  activeAppCount: number;
  cliInstalled: boolean;
}

export interface CLIVersionInfo {
  version: string;
  build: string;
  cliVersion: string;
}

export interface CLIEQBand {
  frequency: number;
  gain: number;
}

export interface CLIEQInfo {
  isEnabled: boolean;
  preset?: string | null;
  bands: CLIEQBand[];
}

export interface CLIResponse {
  success: boolean;
  data?: CLIResponseData | null;
  error?: string | null;
  message?: string | null;
}

export type CLIResponseData =
  | { volume: { _0: number } }
  | { muted: { _0: boolean } }
  | { silentMode: { _0: boolean } }
  | { device: { _0: CLIDeviceInfo } }
  | { devices: { _0: CLIDeviceInfo[] } }
  | { apps: { _0: CLIAppInfo[] } }
  | { app: { _0: CLIAppInfo } }
  | { profiles: { _0: CLIProfileInfo[] } }
  | { mediaInfo: { _0: CLIMediaInfo } }
  | { bluetooth: { _0: CLIBluetoothInfo[] } }
  | { status: { _0: CLIStatusInfo } }
  | { version: { _0: CLIVersionInfo } }
  | { eq: { _0: CLIEQInfo } }
  | { text: { _0: string } }
  | { bool: { _0: boolean } };

export function extractVolume(
  data?: CLIResponseData | null,
): number | undefined {
  if (data && "volume" in data) return data.volume._0;
  return undefined;
}

export function extractMuted(
  data?: CLIResponseData | null,
): boolean | undefined {
  if (data && "muted" in data) return data.muted._0;
  return undefined;
}

export function extractSilentMode(
  data?: CLIResponseData | null,
): boolean | undefined {
  if (data && "silentMode" in data) return data.silentMode._0;
  return undefined;
}

export function extractDevice(
  data?: CLIResponseData | null,
): CLIDeviceInfo | undefined {
  if (data && "device" in data) return data.device._0;
  return undefined;
}

export function extractDevices(
  data?: CLIResponseData | null,
): CLIDeviceInfo[] | undefined {
  if (data && "devices" in data) return data.devices._0;
  return undefined;
}

export function extractApps(
  data?: CLIResponseData | null,
): CLIAppInfo[] | undefined {
  if (data && "apps" in data) return data.apps._0;
  return undefined;
}

export function extractApp(
  data?: CLIResponseData | null,
): CLIAppInfo | undefined {
  if (data && "app" in data) return data.app._0;
  return undefined;
}

export function extractProfiles(
  data?: CLIResponseData | null,
): CLIProfileInfo[] | undefined {
  if (data && "profiles" in data) return data.profiles._0;
  return undefined;
}

export function extractMediaInfo(
  data?: CLIResponseData | null,
): CLIMediaInfo | undefined {
  if (data && "mediaInfo" in data) return data.mediaInfo._0;
  return undefined;
}

export function extractBluetooth(
  data?: CLIResponseData | null,
): CLIBluetoothInfo[] | undefined {
  if (data && "bluetooth" in data) return data.bluetooth._0;
  return undefined;
}

export function extractStatus(
  data?: CLIResponseData | null,
): CLIStatusInfo | undefined {
  if (data && "status" in data) return data.status._0;
  return undefined;
}

export function extractVersion(
  data?: CLIResponseData | null,
): CLIVersionInfo | undefined {
  if (data && "version" in data) return data.version._0;
  return undefined;
}

export function extractEQ(
  data?: CLIResponseData | null,
): CLIEQInfo | undefined {
  if (data && "eq" in data) return data.eq._0;
  return undefined;
}

export function extractText(data?: CLIResponseData | null): string | undefined {
  if (data && "text" in data) return data.text._0;
  return undefined;
}

export function extractBool(
  data?: CLIResponseData | null,
): boolean | undefined {
  if (data && "bool" in data) return data.bool._0;
  return undefined;
}
