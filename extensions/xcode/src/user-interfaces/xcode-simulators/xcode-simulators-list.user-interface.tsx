import { XcodeSimulator } from "../../models/simulator/xcode-simulator.model";
import { List } from "@raycast/api";
import { xcodeSimulatorListItem } from "./xcode-simulators-list-item.user-interface";
import { XcodeSimulatorService } from "../../services/xcode-simulator.service";

/**
 * XcodeSimulator List
 * @param groupedXcodeSimulators The grouped XcodeSimulators by runtime
 * @param xcodeSimulatorService The XcodeSimulatorService
 */
export function xcodeSimulatorsList(
  groupedXcodeSimulators: Map<string, XcodeSimulator[]> | undefined,
  xcodeSimulatorService: XcodeSimulatorService
): JSX.Element {
  return (
    <List isLoading={!groupedXcodeSimulators} searchBarPlaceholder="Search for Xcode Simulators">
      {groupedXcodeSimulators ? sections(groupedXcodeSimulators, xcodeSimulatorService) : undefined}
    </List>
  );
}

/**
 * Sections for grouped XcodeSimulators
 * @param groupedXcodeSimulators The grouped XcodeSimulators
 * @param xcodeSimulatorService The XcodeSimulatorService
 */
function sections(
  groupedXcodeSimulators: Map<string, XcodeSimulator[]>,
  xcodeSimulatorService: XcodeSimulatorService
): JSX.Element[] {
  return Array.from(groupedXcodeSimulators)
    .sort(([lhs], [rhs]) => lhs.localeCompare(rhs))
    .map(([runtime, xcodeSimulators]) => {
      return (
        <List.Section key={runtime} title={runtime}>
          {xcodeSimulators.map((xcodeSimulator) => {
            return xcodeSimulatorListItem(xcodeSimulator, xcodeSimulatorService);
          })}
        </List.Section>
      );
    });
}
