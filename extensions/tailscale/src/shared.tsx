import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import { execSync } from "node:child_process";

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
  lastseen: any;
  exitnode: boolean;
  exitnodeoption: boolean;
}

export class NotConnectedError extends Error {}
export class InvalidPathError extends Error {}

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
};

/**
 * StatusResponse is a subset of the fields returned by `tailscale status --json`.
 */
export type StatusResponse = {
  Peer: Record<string, StatusDevice>;
  Self: StatusDevice;
  TailscaleIPs: string[];
  User: Record<
    string,
    {
      ID: number;
      DisplayName: string;
      LoginName: string;
      ProfilePictureURL: string;
    }
  >;
  Version: string;
};

export function getStatus() {
  const resp = tailscale(`status --json`)!;
  const data = JSON.parse(resp) as StatusResponse;
  if (!data || !data.Self.Online) {
    throw new NotConnectedError();
  }
  return data;
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
    };
    devices.push(device);
  }
  return devices;
}

const prefs = getPreferenceValues();

const tailscalePath: string =
  prefs.tailscalePath && prefs.tailscalePath.length > 0
    ? prefs.tailscalePath
    : "/Applications/Tailscale.app/Contents/MacOS/Tailscale";

/**
 * tailscale runs a command against the Tailscale CLI.
 */
export function tailscale(parameters: string): string {
  try {
    return execSync(`${tailscalePath} ${parameters}`).toString().trim();
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes("No such file or directory")) {
        throw new InvalidPathError();
      }
      if (err.message.includes("is Tailscale running?")) {
        throw new NotConnectedError();
      }
    }
    throw err;
  }
}

export function handleError(err: unknown, fallbackMessage: string) {
  if (err instanceof InvalidPathError) {
    showToast(
      Toast.Style.Failure,
      "Your Tailscale CLI Path is invalid. Update your extension preferences to fix this.",
    );
    return;
  } else if (err instanceof NotConnectedError) {
    showToast(Toast.Style.Failure, "Can’t connect to Tailscale. Make sure Tailscale is open and running.");
    return;
  }
  showToast(Toast.Style.Failure, fallbackMessage);
}
