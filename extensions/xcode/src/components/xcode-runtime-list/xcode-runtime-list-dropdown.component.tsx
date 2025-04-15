import { List } from "@raycast/api";
import { XcodeRuntimePlatformFilter } from "../../models/xcode-runtime/xcode-runtime-platform-filter.model";

export function XcodeRuntimePlatformDropdown(props: {
  onRuntimePlatformFilterChange: (newValue: XcodeRuntimePlatformFilter) => void;
}) {
  const { onRuntimePlatformFilterChange } = props;
  return (
    <List.Dropdown
      tooltip="Select a runtime platform"
      storeValue={true}
      onChange={(newValue) => {
        onRuntimePlatformFilterChange(newValue as XcodeRuntimePlatformFilter);
      }}
    >
      {Object.values(XcodeRuntimePlatformFilter).map((filter) => {
        return <List.Dropdown.Item key={filter} title={filter} value={filter} />;
      })}
    </List.Dropdown>
  );
}
