import { List, Navigation } from "@raycast/api";
import { XcodeSimulatorApplication } from "../../models/simulator/xcode-simulator-application.model";
import { xcodeSimulatorApplicationListItem } from "./xcode-simulator-application-list-item.user-interface";
import { Source } from "../../shared/source";

/**
 * Xcode Simulator Application List
 * @param xcodeSimulatorApplications The XcodeSimulatorApplication that should be shown in the List
 * @param navigation The Navigation
 */
export function xcodeSimulatorApplicationList(
  xcodeSimulatorApplications: Source<XcodeSimulatorApplication[]> | undefined,
  navigation: Navigation
): JSX.Element {
  return (
    <List
      isLoading={xcodeSimulatorApplications ? xcodeSimulatorApplications.isCache : true}
      searchBarPlaceholder="Search for Apps"
    >
      {xcodeSimulatorApplications?.value.map((app) => xcodeSimulatorApplicationListItem(app, navigation))}
    </List>
  );
}
