import { List } from "@raycast/api";
import { XcodeSimulatorStateFilter } from "../../models/xcode-simulator/xcode-simulator-state-filter.model";

export function XcodeSimulatorStateDropdown(props: {
  onSimulatorStateFitlterChange: (newValue: XcodeSimulatorStateFilter) => void;
}) {
  const { onSimulatorStateFitlterChange } = props;
  return (
    <List.Dropdown
      tooltip="Select a simulator state"
      storeValue={true}
      onChange={(newValue) => {
        onSimulatorStateFitlterChange(newValue as XcodeSimulatorStateFilter);
      }}
    >
      {Object.values(XcodeSimulatorStateFilter).map((filter) => {
        return <List.Dropdown.Item key={filter} title={filter} value={filter} />;
      })}
    </List.Dropdown>
  );
}
