import { useCachedPromise } from "@raycast/utils";
import { XcodeSimulatorService } from "../../services/xcode-simulator.service";
import { List } from "@raycast/api";
import { XcodeSimulatorListItem } from "./xcode-simulator-list-item.component";

/**
 * Xcode Simulator List
 */
export function XcodeSimulatorList(): JSX.Element {
  const xcodeSimulatorGroups = useCachedPromise(XcodeSimulatorService.xcodeSimulatorGroups);
  return (
    <List isLoading={xcodeSimulatorGroups.isLoading}>
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
