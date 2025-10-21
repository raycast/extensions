import { IVPN } from "./client";
import { IvpnNotLoggedInError } from "./errors";
import {
  ConnectPayload,
  GetOriginalVpnStatusUnion,
  IVPN_STATUS_SIMPLIFY_MAP,
  IvpnInfoParsed,
  IvpnServerParsed,
  IvpnStatusType,
} from "./types";

// * parse status info

export function parseIvpnStatusOutput(stdout: string): IvpnInfoParsed {
  const rgx =
    /VPN\s*:\s*(?<vpnStatus>[A-Z]+)(\n.*?\s*(?<serverHostname>\S+) \[(?<serverEndpoint>[^\]]+)\], (?<city>.*) \((?<countryCode>[A-Z]{2})\), (?<country>.+)\n.*?Protocol\s*:\s*(?<protocol>[\w]+)( \((?<obfuscation>.+)\))?\n.*?Local IP\s*:\s*(?<localIp>[\d.]+)\n.*?Server IP\s*:\s*(?<serverIp>[\d.]+) \((?<serverProtocol>\w+):(?<serverPort>\d+)\)\n.*?Connected\s*:\s*(?<connectedSince>[\d\- :+A-Za-z]+)\n.*?DNS\s*:\s*(?<dns>[^\n]+))?\n.*?Firewall\s*:\s*(?<fwEnabled>Enabled|Disabled)( \(!\))?\n.*?Allow LAN\s*:\s*(?<fwAllowLan>true|false)\n.*?Allow IVPN servers\s*:\s*(?<fwAllowIvpn>true|false)/;

  const match = stdout.match(rgx);
  if (!match || !match.groups)
    throw new Error("Parse failed, this shouldn't happen. Output of `ivpn status`:\n\n" + stdout + "\n\n");

  const g = match.groups;

  if (!(g.vpnStatus in IVPN_STATUS_SIMPLIFY_MAP))
    throw new Error("Unrecognized IVPN status, this shouldn't happen. Output of `ivpn status`:\n\n" + stdout + "\n\n");

  // assuming that firewall info is always there base on this:
  // https://github.com/ivpn/desktop-app/blob/42d3a507786647d14acacfac427f24e1fc380baa/cli/commands/state.go#L46
  const firewall = {
    enabled: g.fwEnabled === "Enabled",
    allowLan: g.fwAllowLan === "true",
    allowIvpnServers: g.fwAllowIvpn === "true",
  };

  const status = g.vpnStatus as IvpnStatusType;
  const statusSimplified = simplifyIvpnStatus(status);

  if (statusSimplified === "CONNECTED") {
    return {
      vpnStatus: status as GetOriginalVpnStatusUnion<"CONNECTED">,
      vpnStatusSimplified: "CONNECTED",
      serverHostname: g.serverHostname,
      serverEndpoint: g.serverEndpoint,
      serverLocation: {
        city: g.city,
        countryCode: g.countryCode,
        country: g.country,
      },
      protocol: g.protocol,
      obfuscation: g.obfuscation || null,
      localIp: g.localIp,
      serverIp: g.serverIp,
      serverPort: parseInt(g.serverPort, 10),
      serverProtocol: g.serverProtocol,
      connectedSince: new Date(ditchDateTimezone(g.connectedSince)),
      dns: g.dns,
      firewall,
    };
  }

  if (statusSimplified === "DISCONNECTED") {
    return {
      vpnStatus: status as GetOriginalVpnStatusUnion<"DISCONNECTED">,
      vpnStatusSimplified: "DISCONNECTED",
      firewall,
    };
  }

  if (statusSimplified === "CONNECTING") {
    return {
      vpnStatus: status as GetOriginalVpnStatusUnion<"CONNECTING">,
      vpnStatusSimplified: "CONNECTING",
    };
  }

  if (statusSimplified === "ERROR") {
    return {
      vpnStatus: status as GetOriginalVpnStatusUnion<"ERROR">,
      vpnStatusSimplified: "ERROR",
      error: new Error(stdout),
    };
  }

  throw new Error(`Simplified status "${statusSimplified} not recognized. Shouldn't happen."`);
}

function ditchDateTimezone(dateStr: string) {
  return dateStr.split(" ")[0] + "T" + dateStr.split(" ")[1];
}

// * parse servers info

export function parseIvpnServersOutput(stdout: string) {
  const rgx =
    /^\s*(?<protocol>WireGuard|OpenVPN)\s*\|\s*(?<location>[^|]+)\s*\|\s*(?<city>[^(|]+)\s\((?<countryCode>[A-Z]{2})\)\s*\|\s*(?<country>[^|]+)\s*\|\s*(?<ISP>[^|]+)\s*\|\s*(?<ipvTunnels>[^| ]+)\s*\|(\s*(?<pingMs>\d+|\?)\s*(?:ms)?\s*\|)?/gm;

  const servers: IvpnServerParsed[] = [];

  let match;
  while ((match = rgx.exec(stdout)) !== null) {
    const { protocol, location, city, country, countryCode, ISP, ipvTunnels, pingMs } = match.groups!;
    servers.push({
      protocol: protocol as IvpnServerParsed["protocol"],
      location: location,
      city: city,
      country: country,
      countryCode: countryCode,
      ISP: ISP,
      ipvTunnels: ipvTunnels.split("/"),
      pingMs: pingMs === "?" ? null : +pingMs,
    });
  }

  return servers;
}

export function constructCliConnectCommand(payload: ConnectPayload): string {
  if (payload.strategy === "LAST") {
    return "ivpn connect -last";
  }

  if (payload.strategy === "RANDOM") {
    if (payload.protocol !== "any") return `ivpn connect --protocol ${payload.protocol} -any`;
    return "ivpn connect -any";
  }

  if (payload.strategy === "SERVER") {
    if (!payload.host) throw new Error('Server hostname expected when connect strategy is "SERVER"');
    return `ivpn connect ${payload.host}`;
  }

  if (payload.strategy === "FASTEST") {
    if (payload.protocol !== "any") return `ivpn connect --protocol ${payload.protocol} -f`;
    return `ivpn connect -f`;
  }

  throw new Error(`"${payload.strategy}" not handled, shouldn't happen`);
}

export function simplifyIvpnStatus(ivpnStatus: IvpnStatusType) {
  if (!(ivpnStatus in IVPN_STATUS_SIMPLIFY_MAP)) throw new Error(`Unrecognized IVPN status: ${ivpnStatus}`);
  return IVPN_STATUS_SIMPLIFY_MAP[ivpnStatus];
}

// * parse account info

export function parseIvpnAccountOuput(stdout: string) {
  const regex =
    /Account ID:\s+(?<accountId>[^\n]+)\nDevice name:\s+(?<deviceName>[^\n]+)\nPlan:\s+(?<plan>[^\n]+)\nActive until:\s+(?<activeUntil>[^\n]+)/;
  const match = stdout.match(regex);

  if (!match || !match.groups)
    throw new Error("Parse failed, this shouldn't happen. Output of `ivpn status`:\n\n" + stdout + "\n\n");

  const g = match.groups;

  return {
    accountId: g.accountId.trim(),
    deviceName: g.deviceName.trim(),
    plan: g.plan.trim(),
    activeUntil: new Date(ditchDateTimezone(g.activeUntil.trim())),
  };
}

// * misc

export function isValidAccountId(accountId: string) {
  return /^(i-.{4}-.{4}-.{4}|ivpn.{8})$/.test(accountId);
}

export async function verifyIvpnAuth(): Promise<[true, null] | [false, IvpnNotLoggedInError]> {
  try {
    await IVPN.pingCli();
    return [true, null];
  } catch (err) {
    if (err instanceof IvpnNotLoggedInError) {
      return [false, err];
    }
    throw err;
  }
}
