export type ConnectionState =
  | "Disconnected"
  | "Connecting"
  | "Connected"
  | "Interrupted"
  | "Reconnecting"
  | "DisconnectingToReconnect"
  | "Disconnecting"
  /**
   * piactl could not be read (timeout, daemon busy). Deliberately distinct
   * from "Disconnected": treating a failed read as "off" would let the toggle
   * connect a VPN the user asked to disconnect.
   */
  | "Unknown";

export type Protocol = "wireguard" | "openvpn";

export const AUTO_REGION = "auto";

export interface Region {
  /** piactl region id, e.g. "us-new-york". "auto" for automatic selection. */
  id: string;
  /** Display name from PIA's catalog, e.g. "US New York". */
  name: string;
  /** ISO 3166-1 alpha-2 country code, used for the flag. */
  countryCode: string;
  /** Country display name derived from the code. */
  country: string;
  /** Region supports port forwarding. */
  portForward: boolean;
  /** Geo-located region: physically elsewhere, IP registered in-country. */
  geo: boolean;
  /** Region is part of PIA's automatic-selection pool. */
  autoRegion: boolean;
  offline: boolean;
}

/**
 * Every field is optional because each comes from a separate `piactl get` that
 * can fail independently. `undefined` means "not readable right now" and must
 * never be rendered or acted on as though it were a real value.
 */
export interface VpnStatus {
  state: ConnectionState;
  /** Selected region id, or "auto". Undefined when unreadable. */
  regionId?: string;
  vpnIp?: string;
  publicIp?: string;
  protocol?: Protocol;
  /** Forwarded port number, or a status word like "Inactive"/"Attempting". */
  portForward?: string;
  /** Ask for a forwarded port on the next connection. */
  requestPortForward?: boolean;
  /** Allow traffic to devices on the local network while connected. */
  allowLan?: boolean;
}

export type SetupStage =
  | "ready"
  | "checking"
  | "not-installed"
  | "no-cli"
  | "not-logged-in"
  | "daemon-unavailable";

export interface SetupState {
  stage: SetupStage;
  appPath?: string;
  cliPath?: string;
}
