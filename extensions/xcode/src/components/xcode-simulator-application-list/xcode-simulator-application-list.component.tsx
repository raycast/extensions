import { useCachedPromise } from "@raycast/utils";
import { XcodeSimulatorApplicationService } from "../../services/xcode-simulator-application.service";
import { List } from "@raycast/api";
import { XcodeSimulatorApplicationListItem } from "./xcode-simulator-application-list-item.component";
import { XcodeSimulator } from "../../models/xcode-simulator/xcode-simulator.model";
import { XcodeSimulatorApplicationGroup } from "../../models/xcode-simulator/xcode-simulator-application-group.model";

/**
 * Xcode Simulator Application List
 */
export function XcodeSimulatorApplicationList(props: { simulator?: XcodeSimulator }) {
  const xcodeSimulatorApplicationGroups = useCachedPromise(
    XcodeSimulatorApplicationService.xcodeSimulatorApplicationGroups
  );
  let xcodeSimulatorApplicationGroupsData: XcodeSimulatorApplicationGroup[] | undefined;
  if (xcodeSimulatorApplicationGroups.data) {
    const simulatorFilter = props.simulator;
    if (simulatorFilter) {
      const simulatorFilterMatchingGroup = xcodeSimulatorApplicationGroups.data.find(
        (group) => group.simulator.udid === simulatorFilter.udid
      );
      xcodeSimulatorApplicationGroupsData = simulatorFilterMatchingGroup ? [simulatorFilterMatchingGroup] : [];
    } else {
      xcodeSimulatorApplicationGroupsData = xcodeSimulatorApplicationGroups.data;
    }
  }
  return (
    <List isLoading={xcodeSimulatorApplicationGroups.isLoading}>
      {xcodeSimulatorApplicationGroupsData?.map((group) => (
        <List.Section key={group.simulator.udid} title={group.simulator.name} subtitle={group.simulator.runtime}>
          {group.applications.map((application) => (
            <XcodeSimulatorApplicationListItem key={application.id} application={application} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
