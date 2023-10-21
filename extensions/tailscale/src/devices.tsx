import { ActionPanel, List, Action, Icon, Image } from "@raycast/api";
import { useEffect, useState } from "react";
import { Device, getStatus, getDevices, getErrorDetails, ErrorDetails } from "./shared";

function DeviceList() {
  const [devices, setDevices] = useState<Device[]>();
  const [error, setError] = useState<ErrorDetails>();
  useEffect(() => {
    async function fetch() {
      try {
        const status = getStatus();
        const _list = getDevices(status);
        setDevices(_list);
      } catch (error) {
        setError(getErrorDetails(error, "Couldn’t load device list."));
      }
    }
    fetch();
  }, []);

  return (
    <List isLoading={!devices && !error}>
      {error ? (
        <List.EmptyView icon={Icon.Warning} title={error.title} description={error.description} />
      ) : (
        devices?.map((device) => (
          <List.Item
            title={device.name}
            subtitle={device.ipv4 + "   " + device.os}
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
                      text: device.online ? `        Connected` : "Last seen " + formatDate(device.lastseen),
                    },
                  ]
                : [
                    {
                      text: device.online ? `        Connected` : "Last seen " + formatDate(device.lastseen),
                    },
                  ]
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={device.ipv4} title="Copy IPv4" />
                <Action.CopyToClipboard content={device.dns} title="Copy MagicDNS" />
                <Action.CopyToClipboard content={device.ipv6} title="Copy IPv6" />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

export default function Command() {
  return <DeviceList />;
}

function formatDate(d: Date) {
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
}
