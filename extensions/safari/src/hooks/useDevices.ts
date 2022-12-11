import _ from "lodash";
import { useCachedPromise, useExec, useSQL } from "@raycast/utils";
import { homedir } from "os";
import { resolve } from "path";

import { Device, LocalTab, RemoteTab } from "../types";
import { executeJxa, safariAppIdentifier } from "../utils";

const DATABASE_PATH = `${resolve(homedir(), `Library/Containers/com.apple.Safari/Data/Library/Safari`)}/CloudTabs.db`;

const fetchLocalTabs = (): Promise<LocalTab[]> =>
  executeJxa(`
    const safari = Application("${safariAppIdentifier}");
    const tabs = [];
    safari.windows().map(window => {
      const windowTabs = window.tabs();
      if (windowTabs) {
        return windowTabs.map(tab => {
          tabs.push({
            uuid: window.id() + '-' + tab.index(),
            title: tab.name(),
            url: tab.url() || '',
            window_id: window.id(),
            index: tab.index(),
            is_local: true
          });
        })
      } 
    });

    return tabs;
`);

const useRemoteTabs = () => {
  return useSQL<RemoteTab>(
    DATABASE_PATH,
    `SELECT t.tab_uuid as uuid, d.device_uuid, d.device_name, t.title, t.url
         FROM cloud_tabs t
         INNER JOIN cloud_tab_devices d ON t.device_uuid = d.device_uuid`
  );
};

const useDeviceName = () =>
  useExec("/usr/sbin/scutil", ["--get", "ComputerName"], {
    initialData: "Loading…",
    keepPreviousData: true,
  });

const useLocalTabs = () => useCachedPromise(fetchLocalTabs, [], { keepPreviousData: true });

const useDevices = () => {
  const { data: deviceName } = useDeviceName();
  const remoteTabs = useRemoteTabs();
  const localTabs = useLocalTabs();

  const localDevice = {
    uuid: "local",
    name: `${deviceName} ★`,
    tabs: localTabs.data,
  };

  const removeDevices = _.chain(remoteTabs.data)
    .groupBy("device_uuid")
    .transform((devices: Device[], tabs: RemoteTab[], device_uuid: string) => {
      devices.push({
        uuid: device_uuid,
        name: tabs[0].device_name,
        tabs,
      });
    }, [])
    .reject(["name", deviceName])
    .value();

  const devices = [localDevice, ...removeDevices];

  return { devices, permissionView: remoteTabs.permissionView, refreshDevices: localTabs.revalidate };
};

export default useDevices;
