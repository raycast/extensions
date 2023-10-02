import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import { execSync } from "node:child_process";
import fs from "node:fs";

export interface Device {
  self: boolean;
  key: number;
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

export interface LooseObject {
  [key: string]: any;
}

export function loadDevices(self: LooseObject, data: LooseObject) {
  const devices: Device[] = [];
  let theKey = 0;

  const me = {
    self: true,
    key: ++theKey,
    name: self.DNSName.split(".")[0],
    userid: self.UserID,
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

  for (const [key, value] of Object.entries(data)) {
    const device = {
      self: false,
      key: ++theKey,
      name: value.DNSName.split(".")[0],
      userid: value.UserID,
      dns: value.DNSName,
      ipv4: value.TailscaleIPs[0],
      ipv6: value.TailscaleIPs[1],
      os: value.OS == "linux" ? "Linux" : value.OS,
      online: value.Online,
      lastseen: new Date(value.LastSeen),
      exitnode: value.ExitNode,
      exitnodeoption: value.ExitNodeOption,
    };
    devices.push(device);
  }
  return devices;
}

const prefs = getPreferenceValues();

export const tailscalePath: string =
  prefs.tailscalePath && prefs.tailscalePath.length > 0
    ? prefs.tailscalePath
    : "/Applications/Tailscale.app/Contents/MacOS/Tailscale";

export function tailscale(parameters: string): string {
  return execSync(`${tailscalePath} ${parameters}`).toString().trim();
}
