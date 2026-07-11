import { List } from "@raycast/api";
import { AppleDevicesListFilter } from "../../models/apple-device/apple-devices-list-filter.model";

export function AppleDeviceTypeDropdown(props: { onFilterChange: (newValue: AppleDevicesListFilter) => void }) {
  const { onFilterChange } = props;
  return (
    <List.Dropdown
      tooltip="Select a device type"
      storeValue={true}
      onChange={(newValue) => {
        onFilterChange(newValue as AppleDevicesListFilter);
      }}
    >
      {Object.values(AppleDevicesListFilter).map((filter) => {
        return <List.Dropdown.Item key={filter} title={filter} value={filter} />;
      })}
    </List.Dropdown>
  );
}
