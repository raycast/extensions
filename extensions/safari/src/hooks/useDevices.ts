import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise, useExec, useSQL } from "@raycast/utils";
import _ from "lodash";
import { homedir } from "os";
import { resolve } from "path";
import { Device, LocalTab, RemoteTab } from "../types";
import { executeJxa, safariAppIdentifier } from "../utils";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

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
  const { data: deviceName } = useDeviceName();
  const localTabs = useLocalTabs();
  const remoteTabs = useRemoteTabs();
  const [devices, setDevices] = useState<Device[]>([]);
  const permissionView = useRef<JSX.Element | null>(null);

  const localDevice: Device = useMemo(
    () => ({
      uuid: "local",
      name: `${deviceName} ★`,
      tabs: localTabs.data || [],
    }),
    [deviceName, localTabs.data],
  );

  useLayoutEffect(() => {
    const preferences = getPreferenceValues();
    if (preferences.areRemoteTabsUsed) {
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

      setDevices([localDevice, ...remoteDevices]);
      permissionView.current = remoteTabs.permissionView || null;
    } else {
      setDevices([localDevice]);
    }
  }, [localTabs.data, remoteTabs.data, deviceName]);

  return { devices, permissionView, refreshDevices: localTabs.revalidate };
}
