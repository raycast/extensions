import { useCachedPromise, useCachedState } from "@raycast/utils";
import { XcodeSimulatorService } from "../../services/xcode-simulator.service";
import {
  XcodeSimulatorFilter,
  simulatorStateForFilter,
} from "../../models/xcode-simulator/xcode-simulator-filter.model";
import { List } from "@raycast/api";
import { XcodeSimulatorListItem } from "./xcode-simulator-list-item.component";

const filters = [XcodeSimulatorFilter.all, XcodeSimulatorFilter.booted, XcodeSimulatorFilter.shutdown];

export function XcodeSimulatorList(): JSX.Element {
  const [filter, setFilter] = useCachedState<XcodeSimulatorFilter>(XcodeSimulatorFilter.all);
  const xcodeSimulatorGroups = useCachedPromise(XcodeSimulatorService.xcodeSimulatorGroups, [
    simulatorStateForFilter(filter),
  ]);

  return (
    <List
      isLoading={xcodeSimulatorGroups.isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter"
          onChange={(newValue) =>
            setFilter(XcodeSimulatorFilter[newValue.toLowerCase() as keyof typeof XcodeSimulatorFilter])
          }
          storeValue
        >
          {filters.map((filter) => (
            <List.Dropdown.Item key={filter} value={`${filter}`} title={`${filter}`} />
          ))}
        </List.Dropdown>
      }
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
