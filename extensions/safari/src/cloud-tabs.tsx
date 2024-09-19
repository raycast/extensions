import { List } from "@raycast/api";
import _ from "lodash";
import { useState } from "react";
import { DeviceListSection, FallbackSearchSection } from "./components";
import { useDevices } from "./hooks";
import { Device, Tab } from "./types";
import { search } from "./utils";

export default function Command() {
  const { devices, permissionView, refreshDevices } = useDevices();
  const [searchText, setSearchText] = useState<string>("");

  if (permissionView) {
    return permissionView;
  }

  return (
    <List isLoading={!devices} onSearchTextChange={setSearchText}>
      {_.map(devices, (device: Device) => {
        const tabs = search(
          typeof device.tabs === "undefined" ? [] : device.tabs,
          [
            { name: "title", weight: 3 },
            { name: "url", weight: 1 },
          ],
          searchText,
        ) as Tab[];
        return <DeviceListSection key={device.uuid} device={device} filteredTabs={tabs} refresh={refreshDevices} />;
      })}
      <FallbackSearchSection searchText={searchText} />
    </List>
  );
}
