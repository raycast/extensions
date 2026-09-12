export type ConnectionState =
  | "Disconnected"
  | "Connecting"
  | "Connected"
  | "Interrupted"
  | "Reconnecting"
  | "DisconnectingToReconnect"
  | "Disconnecting"
  /** piactl could not be read. Distinct from "Disconnected" so a failed read never inverts a toggle. */
  | "Unknown";

export type Protocol = "wireguard" | "openvpn";

export const AUTO_REGION = "auto";

export interface Region {
  /** piactl region id, e.g. "us-new-york", or "auto". */
  id: string;
  name: string;
  countryCode: string;
  country: string;
  portForward: boolean;
  /** IP registered in-country, server hosted elsewhere. */
  geo: boolean;
  autoRegion: boolean;
  offline: boolean;
}

/** Each field comes from a separate `piactl get`, so any of them can be unreadable. */
export interface VpnStatus {
  state: ConnectionState;
  regionId?: string;
  vpnIp?: string;
  publicIp?: string;
  protocol?: Protocol;
  /** Port number once forwarded, otherwise a status word like "Inactive". */
  portForward?: string;
  requestPortForward?: boolean;
  allowLan?: boolean;
}

export type SetupStage = "ready" | "checking" | "not-installed" | "no-cli" | "not-logged-in" | "daemon-unavailable";

export interface SetupState {
  stage: SetupStage;
  appPath?: string;
  cliPath?: string;
}
