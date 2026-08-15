import { GetKeysByValueType } from "@/utils/types";

export const IVPN_STATUS_SIMPLIFY_MAP = {
  CONNECTED: "CONNECTED",
  DISCONNECTED: "DISCONNECTED",
  CONNECTING: "CONNECTING",
  WAIT: "CONNECTING",
  AUTH: "CONNECTING",
  GETCONFIG: "CONNECTING",
  ASSIGNIP: "CONNECTING",
  ADDROUTES: "CONNECTING",
  RECONNECTING: "CONNECTING",
  TCP_CONNECT: "CONNECTING",
  INITIALISED: "CONNECTING",
  EXITING: "ERROR",
} as const;

type SimplifyMap = typeof IVPN_STATUS_SIMPLIFY_MAP;

export type IvpnStatusType = keyof SimplifyMap;

export type IvpnStatusSimplified = SimplifyMap[IvpnStatusType];

type IvpnConnectionInfo = {
  vpnStatus: IvpnStatusType;
  vpnStatusSimplified: IvpnStatusSimplified;
  serverHostname: string;
  serverEndpoint: string;
  serverLocation: {
    city: string;
    countryCode: string;
    country: string;
  };
  protocol: string;
  obfuscation: string | null;
  localIp: string;
  serverIp: string;
  serverPort: number;
  serverProtocol: string;
  connectedSince: Date;
  dns: string;
  firewall: {
    enabled: boolean;
    allowLan: boolean;
    allowIvpnServers: boolean;
  };
};

export type GetOriginalVpnStatusUnion<Simplified extends SimplifyMap[keyof SimplifyMap]> = GetKeysByValueType<
  SimplifyMap,
  Simplified
>;

export type IvpnInfoMap = {
  CONNECTED: { vpnStatusSimplified: "CONNECTED" } & Omit<IvpnConnectionInfo, "vpnStatus" | "vpnStatusSimplified"> & {
      vpnStatus: GetOriginalVpnStatusUnion<"CONNECTED">;
    };
  DISCONNECTED: { vpnStatusSimplified: "DISCONNECTED" } & Pick<IvpnConnectionInfo, "vpnStatus" | "firewall"> & {
      vpnStatus: GetOriginalVpnStatusUnion<"DISCONNECTED">;
    };
  CONNECTING: { vpnStatusSimplified: "CONNECTING" } & Pick<IvpnConnectionInfo, "vpnStatus"> & {
      vpnStatus: GetOriginalVpnStatusUnion<"CONNECTING">;
    };
  ERROR: { vpnStatus: GetOriginalVpnStatusUnion<"ERROR">; vpnStatusSimplified: "ERROR"; error: Error };
};

export type IvpnInfoParsed = IvpnInfoMap[keyof IvpnInfoMap];

export type IvpnServerParsed = {
  protocol: "OpenVPN" | "WireGuard";
  location: string;
  city: string;
  country: string;
  countryCode: string;
  ISP: string;
  ipvTunnels: string[];
  pingMs: number | null;
};

export type VpnProtocol = "OpenVPN" | "WireGuard";

export type ConnectPayload = {
  strategy: Preferences["defaultConnectStrategy"] | "SERVER";
  protocol?: Preferences["preferredProtocol"];
  host?: string;
};
