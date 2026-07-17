import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise, useExec, useSQL } from "@raycast/utils";
import _ from "lodash";
import { homedir } from "os";
import { resolve } from "path";
import { Device, LocalTab, RemoteTab } from "../types";
import { useMemo } from "react";
import { getLocalTabs } from "swift:../../swift/SafariTabs";
import { getInstalledSafariApps } from "../safari-apps";
import { isStartPageTab } from "../tab-utils";

const DATABASE_PATH = `${resolve(homedir(), `Library/Containers/com.apple.Safari/Data/Library/Safari`)}/CloudTabs.db`;

async function fetchLocalDevices(deviceName: string): Promise<Device[]> {
  const safariApps = await getInstalledSafariApps();

  const localDevices = await Promise.all(
    safariApps.map(async (app) => {
      try {
        const tabs = ((await getLocalTabs(app.path, app.id, app.name)) as LocalTab[]).filter(
          (tab) => !isStartPageTab(tab),
        );

        return {
          uuid: `local:${app.id}`,
          name: `${deviceName} ★ - ${app.name}`,
          tabs,
        };
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error(`Failed to get tabs for ${app.name}`, error);
        }

        return {
          uuid: `local:${app.id}`,
          name: `${deviceName} ★ - ${app.name}`,
          tabs: [],
        };
      }
    }),
  );

  return localDevices.filter((device) => device.tabs.length > 0);
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

function useLocalDevices(deviceName?: string) {
  return useCachedPromise(fetchLocalDevices, [deviceName || "This Mac"], { keepPreviousData: false });
}

export default function useDevices() {
  const { data: deviceName } = useDeviceName();
  const localDevices = useLocalDevices(deviceName);
  const remoteTabs = useRemoteTabs();
  const preferences = getPreferenceValues();

  const remoteDevices = useMemo(
    () =>
      _.chain(remoteTabs.data)
        .reject(isStartPageTab)
        .groupBy("device_uuid")
        .transform((accumulator: Device[], tabs: RemoteTab[], device_uuid: string) => {
          accumulator.push({
            uuid: device_uuid,
            name: tabs[0].device_name,
            tabs,
          });
        }, [])
        .reject(["name", deviceName])
        .value(),
    [remoteTabs.data, deviceName],
  );

  const localData = localDevices.isLoading ? [] : localDevices.data || [];
  const devices = preferences.areRemoteTabsUsed ? [...localData, ...remoteDevices] : localData;
  const isLoading = localDevices.isLoading || (preferences.areRemoteTabsUsed && remoteTabs.isLoading);
  const permissionView = preferences.areRemoteTabsUsed ? remoteTabs.permissionView || null : null;

  return { devices, isLoading, permissionView, refreshDevices: localDevices.revalidate };
}
