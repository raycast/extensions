import { getPreferenceValues, List } from "@raycast/api";
import { useThrottle } from "ahooks";
import _ from "lodash";
import { useState } from "react";
import { DeviceListSection, FallbackSearchSection } from "./components";
import { useDevices } from "./hooks";
import { Device, Tab } from "./types";
import { search } from "./utils";

export default function Command() {
  const { devices, permissionView, refreshDevices } = useDevices();
  const [searchText, setSearchText] = useState("");
  const throttleSearchText = useThrottle(searchText, { wait: 200 });

  if (permissionView.current) {
    return permissionView.current;
  }

  return (
    <List isLoading={!devices} onSearchTextChange={setSearchText}>
      {_.map(devices, (device: Device) => {
        const tabs = search(
          typeof device.tabs === "undefined" ? [] : device.tabs,
          [
            { name: "title", weight: 3 },
            { name: "title_formatted", weight: 2 },
            { name: "url", weight: 1 },
          ],
          throttleSearchText,
        ) as Tab[];
        return <DeviceListSection key={device.uuid} device={device} filteredTabs={tabs} refresh={refreshDevices} />;
      })}
      <FallbackSearchSection searchText={searchText} fallbackSearchType={getPreferenceValues().fallbackSearchType} />
    </List>
  );
}
