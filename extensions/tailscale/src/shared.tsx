import { getPreferenceValues } from "@raycast/api";
import { execSync } from "node:child_process";

export const MULLVAD_DEVICE_TAG = "tag:mullvad-exit-node";

export interface Device {
  self: boolean;
  key: string;
  name: string;
  userid: string;
  dns: string;
  ipv4: string;
  ipv6: string;
  os: string;
  online: boolean;
  lastseen: Date;
  exitnode: boolean;
  exitnodeoption: boolean;
  tags?: string[];
}

export class InvalidPathError extends Error {}
export class NotRunningError extends Error {}
export class NotConnectedError extends Error {}
export class ENOBUFSError extends Error {}
export class MaxBufferNaNError extends Error {}

export type StatusDevice = {
  Active: boolean;
  ID: string;
  DNSName: string;
  ExitNode: boolean;
  ExitNodeOption: boolean;
  Online: boolean;
  OS: string;
  TailscaleIPs: string[];
  LastSeen: string;
  UserID: number;
  HostName: string;
  Tags?: string[];
};

/**
 * StatusResponse is a subset of the fields returned by `tailscale status --json`.
 */
export type StatusResponse = {
  Version: string;
  TailscaleIPs: string[];
  Self: StatusDevice;
  MagicDNSSuffix: string;
  Peer: Record<string, StatusDevice>;
  User: Record<
    string,
    {
      ID: number;
      DisplayName: string;
      LoginName: string;
      ProfilePictureURL: string;
    }
  >;
};

/**
 * NetcheckResponse are the fields returned by `tailscale netcheck --format json`.
 * These are mentioned to not be stable and may change in the future. Doubtful, but possible.
 */
export type NetcheckResponse = {
  UDP: boolean;
  IPv4: boolean;
  GlobalV4: string;
  IPv6: boolean;
  GlobalV6: string;
  MappingVariesByDestIP: boolean;
  UPnP: boolean;
  PMP: boolean;
  PCP: boolean;
  PreferredDERP: number;
  RegionLatency: Record<string, number>;
  RegionV4Latency: Record<string, number>;
  RegionV6Latency: Record<string, number>;
};

export type DerpRegion = {
  RegionId: number;
  RegionCode: string;
  RegionName: string;
  Latitude: number;
  Longitude: number;
  Nodes: DerpNode[];
};

type DerpNode = {
  Name: string;
  RegionID: number;
  HostName: string;
  IPv4: string;
  IPv6: string;
  CanPort80: boolean;
};

export type Derp = {
  id: string;
  code: string;
  name: string;
  latency: string | undefined;
  latencies: {
    v4: string | undefined;
    v6: string | undefined;
  };
  nodes: DerpNode[];
};

export function getStatus(peers = true) {
  const resp = tailscale(`status --json --peers=${peers}`);
  const data = JSON.parse(resp) as StatusResponse;
  if (!data || !data.Self.Online) {
    throw new NotConnectedError();
  }
  return data;
}

export function getNetcheck() {
  const resp = tailscale("netcheck --format json");
  return JSON.parse(resp);
}

/**
 * This funtion relies on a debug command, so it may not be stable on the returned value.
 */
export function getDerpMap() {
  const resp = tailscale("debug netmap");
  return JSON.parse(resp).DERPMap.Regions as DerpRegion[];
}

export function getDevices(status: StatusResponse) {
  const devices: Device[] = [];
  const self = status.Self;

  const me = {
    self: true,
    key: self.ID,
    name: self.DNSName.split(".")[0],
    userid: self.UserID.toString(),
    dns: self.DNSName,
    ipv4: self.TailscaleIPs[0],
    ipv6: self.TailscaleIPs[1],
    os: self.OS,
    online: self.Online,
    lastseen: new Date(self.LastSeen),
    exitnode: self.ExitNode,
    exitnodeoption: self.ExitNodeOption,
    tags: self.Tags,
  };

  devices.push(me);

  for (const [, peer] of Object.entries(status.Peer)) {
    const device = {
      self: false,
      key: peer.ID,
      name: peer.DNSName.split(".")[0],
      userid: peer.UserID.toString(),
      dns: peer.DNSName,
      ipv4: peer.TailscaleIPs[0],
      ipv6: peer.TailscaleIPs[1],
      os: peer.OS == "linux" ? "Linux" : peer.OS,
      online: peer.Online,
      lastseen: new Date(peer.LastSeen),
      exitnode: peer.ExitNode,
      exitnodeoption: peer.ExitNodeOption,
      tags: peer.Tags,
    };
    devices.push(device);
  }
  return devices;
}

export function sortDevices(devices: Device[]) {
  devices.sort((a, b) => {
    // self should always be first
    if (a.self) {
      return -1;
    } else if (b.self) {
      return 1;
    }
    // then sort by online status
    if (a.online && !b.online) {
      return -1;
    } else if (!a.online && b.online) {
      return 1;
    }
    // lastly, sort by name
    return a.name.localeCompare(b.name);
  });
}

const prefs = getPreferenceValues();

const tailscalePath: string =
  prefs.tailscalePath && prefs.tailscalePath.length > 0
    ? prefs.tailscalePath
    : "/Applications/Tailscale.app/Contents/MacOS/Tailscale";

const execMaxBuffersBytes: number =
  prefs.tailscaleExecMaxBuffersMB && (prefs.tailscaleExecMaxBuffersMB as number)
    ? prefs.tailscaleExecMaxBuffersMB * 1024 * 1024
    : 10 * 1024 * 1024; // 10 megabytes

/**
 * tailscale runs a command against the Tailscale CLI.
 */
export function tailscale(parameters: string): string {
  try {
    return execSync(`${tailscalePath} ${parameters}`, { maxBuffer: execMaxBuffersBytes }).toString().trim();
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes("No such file or directory")) {
        throw new InvalidPathError();
      } else if (err.message.includes("is Tailscale running?")) {
        throw new NotRunningError();
      } else if (err.message.includes("spawnSync /bin/sh ENOBUFS")) {
        throw new ENOBUFSError();
      } else if (
        err.message.includes(
          'The value of "options.maxBuffer" is out of range. It must be a positive number. Received NaN',
        )
      ) {
        throw new MaxBufferNaNError();
      }
    }
    console.log(`throwing error: ${err}`);
    throw err;
  }
}

export type ErrorDetails = {
  title: string;
  description: string;
};

export function getErrorDetails(err: unknown, fallbackMessage: string): ErrorDetails {
  if (err instanceof InvalidPathError) {
    return {
      title: "Can’t find the Tailscale CLI",
      description: "Your Tailscale CLI Path is invalid.\nUpdate your extension preferences to fix this.",
    };
  } else if (err instanceof NotRunningError) {
    return {
      title: "Can’t connect to Tailscale",
      description: "Make sure Tailscale is running and try again.",
    };
  } else if (err instanceof NotConnectedError) {
    return {
      title: "Not connected to a tailnet",
      description: "Tailscale is running, but you’re not connected to a tailnet.\nLog in and try again.",
    };
  } else if (err instanceof ENOBUFSError) {
    return {
      title: "Response larger than buffer size",
      description: "Increase `Max buffers ...` in the extension configuration.",
    };
  } else if (err instanceof MaxBufferNaNError) {
    return {
      title: "Invalid `Max buffers ...` configuration",
      description: "Set `Max buffers ...` to a number in the extension configuration.",
    };
  }
  console.log(`Unhandled error: ${err}`);
  return {
    title: "Something went wrong",
    description: fallbackMessage,
  };
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
