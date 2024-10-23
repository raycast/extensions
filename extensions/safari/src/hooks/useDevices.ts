import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise, useExec, useSQL } from "@raycast/utils";
import _ from "lodash";
import { homedir } from "os";
import { resolve } from "path";
import { Device, LocalTab, RemoteTab } from "../types";
import { executeJxa, safariAppIdentifier } from "../utils";

const DATABASE_PATH = `${resolve(homedir(), `Library/Containers/com.apple.Safari/Data/Library/Safari`)}/CloudTabs.db`;

function fetchLocalTabs(): Promise<LocalTab[]> {
  return executeJxa(`
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
}

function useRemoteTabs() {
  return useSQL<RemoteTab>(
    DATABASE_PATH,
    `SELECT t.tab_uuid as uuid, d.device_uuid, d.device_name, t.title, t.url
         FROM cloud_tabs t
         INNER JOIN cloud_tab_devices d ON t.device_uuid = d.device_uuid`,
  );
}

function useDeviceName() {
  return useExec("/usr/sbin/scutil", ["--get", "ComputerName"], {
    initialData: "Loading…",
    keepPreviousData: true,
  });
}

function useLocalTabs() {
  return useCachedPromise(fetchLocalTabs, [], { keepPreviousData: true });
}

export default function useDevices() {
  const preferences = getPreferenceValues();
  const { data: deviceName } = useDeviceName();
  const localTabs = useLocalTabs();
  const localDevice: Device = {
    uuid: "local",
    name: `${deviceName} ★`,
    tabs: localTabs.data || [],
  };
  const devices: Device[] = [localDevice];
  let permissionView;

  if (preferences.areRemoteTabsUsed) {
    const remoteTabs = useRemoteTabs();
    const remoteDevices = _.chain(remoteTabs.data)
      .groupBy("device_uuid")
      .transform((accumulator: Device[], tabs: RemoteTab[], device_uuid: string) => {
        accumulator.push({
          uuid: device_uuid,
          name: tabs[0].device_name,
          tabs,
        });
      }, [])
      .reject(["name", deviceName])
      .value();

    devices.push(...remoteDevices);
    permissionView = remoteTabs.permissionView;
  }

  return { devices, permissionView, refreshDevices: localTabs.revalidate };
}
