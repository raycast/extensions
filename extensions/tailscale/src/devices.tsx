import { ActionPanel, Detail, List, Action, useNavigation, Color, Icon, showToast, Toast, Image } from "@raycast/api";
import { FormValueModel } from "@raycast/api/types/api/internal";
import React, { useEffect, useState } from "react";
import { runAppleScript } from "run-applescript";

interface Device {
  self: boolean;
  key: number;
  name: string;
  dns: string;
  ipv4: string;
  ipv6: string;
  os: string;
  online: boolean;
  lastseen: any;
}

interface LooseObject {
  [key: string]: any;
}

function loadDevices(self: LooseObject, data: LooseObject) {
  const devices: Device[] = [];
  let theKey = 0;

  const me = {
    self: true,
    key: ++theKey,
    name: self.DNSName.split(".")[0],
    dns: self.DNSName,
    ipv4: self.TailscaleIPs[0],
    ipv6: self.TailscaleIPs[1],
    os: self.OS,
    online: self.Online,
    lastseen: new Date(self.LastSeen),
  };

  devices.push(me);

  for (const [key, value] of Object.entries(data)) {
    const device = {
      self: false,
      key: ++theKey,
      name: value.DNSName.split(".")[0],
      dns: value.DNSName,
      ipv4: value.TailscaleIPs[0],
      ipv6: value.TailscaleIPs[1],
      os: value.OS == "linux" ? "Linux" : value.OS,
      online: value.Online,
      lastseen: new Date(value.LastSeen),
    };
    devices.push(device);
  }
  console.log(devices);
  return devices;
}

function DeviceList() {
  const [devices, setDevices] = useState<Device[]>();
  useEffect(() => {
    async function fetch() {
      try {
        const ret = await runAppleScript(
          'do shell script "/Applications/Tailscale.app/Contents/MacOS/Tailscale status --json"'
        );
        const data: LooseObject = JSON.parse(ret);

        if (!data.Self.Online) {
          throw "Tailscale not connected";
        }

        const _list = loadDevices(data.Self, data.Peer);
        setDevices(_list);
      } catch (error) {
        showToast(Toast.Style.Failure, "Couldn't load devices. Make sure Tailscale is connected.");
      }
    }
    fetch();
  }, []);

  return (
    <List isLoading={devices === undefined}>
      {devices?.map((device) => (
        <List.Item
          title={device.name}
          subtitle={device.ipv4 + "    " + device.os}
          key={device.key}
          icon={
            device.online
              ? {
                  source: {
                    light: "connected_light.png",
                    dark: "connected_dark.png",
                  },
                  mask: Image.Mask.Circle,
                }
              : {
                  source: {
                    light: "lastseen_light.png",
                    dark: "lastseen_dark.png",
                  },
                  mask: Image.Mask.Circle,
                }
          }
          accessories={
            device.self
              ? [
                  { text: "This device", icon: Icon.Person },
                  {
                    text: device.online
                      ? `        Connected`
                      : "Last seen " +
                        device.lastseen.toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "numeric",
                        }),
                  },
                ]
              : [
                  {
                    text: device.online
                      ? `        Connected`
                      : "Last seen " +
                        device.lastseen.toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "numeric",
                        }),
                  },
                ]
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={device.ipv4} title="Copy IPv4 Address to Clipboard" />
              <Action.CopyToClipboard content={device.dns} title="Copy MagicDNS to Clipboard" />
              <Action.CopyToClipboard content={device.ipv6} title="Copy IPv6 Address to Clipboard" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command() {
  return <DeviceList />;
}
