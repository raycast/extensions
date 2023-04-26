import { ActionPanel, Action, Icon, List, LocalStorage } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { KDEConnect, KDEDevice } from "./device";
import { appExists } from "./connector";
import { StorageKey } from "./storage";
import GetKDEConnect from "./getKDEConnect";

// TODO: init from storage
let connect = new KDEConnect();

export default function Command() {
  let [loading, setLoading] = useState<boolean>(true);
  let [appOk, setAppOk] = useState<boolean | undefined>();
  let [devices, setDevices] = useState<KDEDevice[]>([]);
  let [choseDevice, chooseDevice] = useState<KDEDevice[]>([]);

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
      refreshDevices();
    }
  }, [appOk]);

  const deviceStatus = (item: KDEDevice): string => {
    return item.paired ? (item.reachable ? "Connected" : "Unreachable") : "Not Paired";
  };

  const deviceStatusIcon = (item: KDEDevice): Icon => {
    return item.paired ? (item.reachable ? Icon.Bolt : Icon.BoltDisabled) : Icon.Link;
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
          accessories={[{ icon: deviceStatusIcon(item), text: deviceStatus(item) }]}
          actions={
            <ActionPanel>
              {item.paired ? (
                <React.Fragment />
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
