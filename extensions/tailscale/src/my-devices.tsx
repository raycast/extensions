import { List, Icon, Image } from "@raycast/api";
import { useEffect, useState } from "react";
import { Device, getStatus, getErrorDetails, getDevices, sortDevices, ErrorDetails } from "./shared";
import CopyActions from "./components/CopyActions";

export default function MyDeviceList() {
  const [devices, setDevices] = useState<Device[]>();
  const [error, setError] = useState<ErrorDetails>();
  useEffect(() => {
    async function fetch() {
      try {
        const status = getStatus();
        const me: string = status.Self.UserID.toString();
        const _list = getDevices(status);
        const _mylist = _list.filter((device) => device.userid === me);
        sortDevices(_mylist);
        setDevices(_mylist);
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
            actions={<CopyActions device={device} />}
          />
        ))
      )}
    </List>
  );
}
