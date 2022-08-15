import { useCachedPromise } from "@raycast/utils";
import { XcodeSimulatorService } from "../../services/xcode-simulator.service";
import { List } from "@raycast/api";
import { XcodeSimulatorListItem } from "./xcode-simulator-list-item.component";

/**
 * Xcode Simulator List
 */
export function XcodeSimulatorList(): JSX.Element {
  const { isLoading, data, revalidate } = useCachedPromise(XcodeSimulatorService.xcodeSimulatorGroups);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search for Xcode Simulators">
      {data?.map((xcodeSimulatorGroup) => {
        return (
          <List.Section key={xcodeSimulatorGroup.runtime} title={xcodeSimulatorGroup.runtime}>
            {xcodeSimulatorGroup.simulators.map((xcodeSimulator) => {
              return (
                <XcodeSimulatorListItem key={xcodeSimulator.udid} simulator={xcodeSimulator} revalidate={revalidate} />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
