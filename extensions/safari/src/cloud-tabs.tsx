import _ from "lodash";
import { useState } from "react";
import { List } from "@raycast/api";

import { DeviceListSection, FallbackSearchSection } from "./components";
import { useDevices } from "./hooks";
import { Device, Tab } from "./types";
import { search } from "./utils";

const Command = () => {
  const { devices, permissionView, refreshDevices } = useDevices();
  const [searchText, setSearchText] = useState<string>("");

  if (permissionView) {
    return permissionView;
  }

  return (
    <List isLoading={!devices} onSearchTextChange={setSearchText}>
      {_.map(devices, (device: Device) => {
        const tabs = search(device.tabs, ["title", "url"], searchText) as Tab[];
        return <DeviceListSection key={device.uuid} device={device} filteredTabs={tabs} refresh={refreshDevices} />;
      })}
      <FallbackSearchSection searchText={searchText} />
    </List>
  );
};

export default Command;
