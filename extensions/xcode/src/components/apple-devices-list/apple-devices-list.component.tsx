import { List } from "@raycast/api";
import { useState } from "react";
import { AppleDevicesListFilter } from "../../models/apple-device/apple-devices-list-filter.model";
import { AppleDevicesService } from "../../services/apple-devices.service";
import { AppleDeviceTypeDropdown } from "./apple-devices-list-dropdown.component";
import { groupBy } from "../../shared/group-by";
import { AppleDevicesListItem } from "./apple-devices-list-item.components";
import { useCachedPromise } from "@raycast/utils";

export function AppleDevicesList() {
  const [filter, setFilter] = useState<AppleDevicesListFilter>(AppleDevicesListFilter.all);
  const devices = useCachedPromise(AppleDevicesService.devices, [filter]);

  const onFilterChange = (newValue: AppleDevicesListFilter) => {
    setFilter(newValue);
  };
  return (
    <List
      isLoading={devices.isLoading}
      filtering={{ keepSectionOrder: true }}
      searchBarAccessory={<AppleDeviceTypeDropdown onFilterChange={onFilterChange} />}
    >
      {groupBy(devices.data ?? [], (device) => device.type).map((group) => {
        return (
          <List.Section key={group.key} title={group.key}>
            {group.values
              .sort((a, b) => (a > b ? 1 : -1))
              .map((device) => (
                <AppleDevicesListItem
                  key={`${device.identifier}${device.name}`}
                  device={device}
                  revalidate={devices.revalidate}
                />
              ))}
          </List.Section>
        );
      })}
    </List>
  );
}
