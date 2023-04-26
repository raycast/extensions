import { ActionPanel, Action, Icon, List, LocalStorage } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { KDEConnect, KDEDevice } from "./device";
import { appExists } from "./connector";
import { StorageKey } from "./storage";
import GetKDEConnect from "./getKDEConnect";

const connect = new KDEConnect();

export default function Command() {
  const [loading, setLoading] = useState<boolean>(true);
  const [appOk, setAppOk] = useState<boolean | undefined>();
  const [devices, setDevices] = useState<KDEDevice[]>([]);
  const [favouriteDevice, setFavouriteDevice] = useState<string | undefined>();

  const refreshDevices = () => {
    setLoading(true);
    connect.listDevices().then((devices) => {
      setDevices(devices);
      setLoading(false);
    });
  };

  useEffect(() => {
    setAppOk(appExists());
    if (!appOk) {
      return;
    }
  }, []);

  useEffect(() => {
    if (appOk) {
      LocalStorage.getItem(StorageKey.pairedDevices).then((value) => {
        if (loading && value) {
          const devices = JSON.parse(value as string) as KDEDevice[];
          setDevices(devices);
        }
      });
      LocalStorage.getItem(StorageKey.favouriteDevice).then((value) => {
        if (loading && value) {
          const device = value as string;
          console.log("fav", device);
          setFavouriteDevice(device);
        }
      });
      refreshDevices();
    }
  }, [appOk]);

  const deviceStatus = (item: KDEDevice): string => {
    return item.paired ? (item.reachable ? "Connected" : "Unreachable") : "Not Paired";
  };

  const deviceStatusIcon = (item: KDEDevice): Icon => {
    return item.paired ? (item.reachable ? Icon.Bolt : Icon.BoltDisabled) : Icon.Link;
  };

  const setFavourite = (device: KDEDevice | undefined) => {
    if (!device) {
      LocalStorage.removeItem(StorageKey.favouriteDevice);
    } else {
      LocalStorage.setItem(StorageKey.favouriteDevice, device.id);
    }
    setFavouriteDevice(device?.id);
  };

  if (appOk === false) {
    return <GetKDEConnect />;
  }

  return (
    <List isLoading={loading}>
      {devices.map((item) => (
        <List.Item
          key={item.id}
          icon={Icon.Mobile}
          title={item.name}
          subtitle={item.id}
          accessories={(item.id === favouriteDevice ? [{ icon: Icon.Star, text: "Favourite" }] : []).concat([
            { icon: deviceStatusIcon(item), text: deviceStatus(item) },
          ])}
          actions={
            <ActionPanel>
              {item.paired ? (
                <React.Fragment>
                  <Action
                    title="Set Favourite"
                    onAction={() => {
                      setFavourite(item);
                    }}
                  />
                  <Action
                    title="Unset Favourite"
                    onAction={() => {
                      setFavourite(undefined);
                    }}
                  />
                  <Action
                    title="Unpair"
                    onAction={() => {
                      connect.unpairDevice(item.id);
                    }}
                  />
                </React.Fragment>
              ) : (
                <Action
                  title="Pair Device"
                  onAction={() => {
                    setLoading(true);
                    connect.pairDevice(item.id).then(() => {
                      setLoading(false);
                    });
                    refreshDevices();
                  }}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
