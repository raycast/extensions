import { useCachedPromise } from "@raycast/utils";
import { XcodeSimulatorService } from "../../services/xcode-simulator.service";
import { XcodeSimulatorStateDropdown } from "./xcode-simulator-list-dropdown.component";
import { List } from "@raycast/api";
import { XcodeSimulatorListItem } from "./xcode-simulator-list-item.component";
import { useState } from "react";
import { XcodeSimulatorStateFilter } from "../../models/xcode-simulator/xcode-simulator-state-filter.model";

export function XcodeSimulatorList() {
  const [simulatorStateFilter, setSimulatorStateFilter] = useState<XcodeSimulatorStateFilter>(
    XcodeSimulatorStateFilter.all
  );
  const xcodeSimulatorGroups = useCachedPromise(XcodeSimulatorService.xcodeSimulatorGroups, [simulatorStateFilter]);

  const onSimulatorStateFilterChange = (newValue: XcodeSimulatorStateFilter) => {
    setSimulatorStateFilter(newValue);
  };
  return (
    <List
      isLoading={xcodeSimulatorGroups.isLoading}
      searchBarAccessory={<XcodeSimulatorStateDropdown onSimulatorStateFilterChange={onSimulatorStateFilterChange} />}
    >
      {xcodeSimulatorGroups.data?.map((xcodeSimulatorGroup) => {
        return (
          <List.Section key={xcodeSimulatorGroup.runtime} title={xcodeSimulatorGroup.runtime}>
            {xcodeSimulatorGroup.simulators.map((xcodeSimulator) => (
              <XcodeSimulatorListItem
                key={xcodeSimulator.udid}
                simulator={xcodeSimulator}
                revalidate={xcodeSimulatorGroups.revalidate}
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
