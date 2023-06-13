import { useCachedPromise } from "@raycast/utils";
import { XcodeSimulatorApplicationService } from "../../services/xcode-simulator-application.service";
import { List } from "@raycast/api";
import { XcodeSimulatorApplicationListItem } from "./xcode-simulator-application-list-item.component";

/**
 * Xcode Simulator Application List
 */
export function XcodeSimulatorApplicationList(): JSX.Element {
  const xcodeSimulatorApplicationGroups = useCachedPromise(
    XcodeSimulatorApplicationService.xcodeSimulatorApplicationGroups
  );
  return (
    <List isLoading={xcodeSimulatorApplicationGroups.isLoading}>
      {xcodeSimulatorApplicationGroups.data?.map((group) => (
        <List.Section key={group.simulator.udid} title={group.simulator.name} subtitle={group.simulator.runtime}>
          {group.applications.map((application) => (
            <XcodeSimulatorApplicationListItem key={application.id} application={application} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
