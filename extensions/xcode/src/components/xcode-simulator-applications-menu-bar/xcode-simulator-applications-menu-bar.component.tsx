import { useCachedPromise } from "@raycast/utils";
import { Icon, MenuBarExtra } from "@raycast/api";
import { XcodeSimulatorApplicationService } from "../../services/xcode-simulator-application.service";
import { XcodeSimulatorApplicationsMenuBarItem } from "./xcode-simulator-applications-menu-bar-item.component";

/**
 * Xcode Simulator Applications Menu Bar
 */
export function XcodeSimulatorApplicationsMenuBar() {
  const xcodeSimulatorApplicationsGroups = useCachedPromise(
    XcodeSimulatorApplicationService.xcodeSimulatorApplicationGroups
  );
  return (
    <MenuBarExtra
      isLoading={xcodeSimulatorApplicationsGroups.isLoading}
      icon={Icon.Mobile}
      tooltip="Show Recent Builds"
    >
      {!xcodeSimulatorApplicationsGroups.isLoading && !xcodeSimulatorApplicationsGroups.data?.length ? (
        <MenuBarExtra.Item title={"No recent builds"} />
      ) : undefined}
      {xcodeSimulatorApplicationsGroups.data?.map((group) => (
        <MenuBarExtra.Section key={group.simulator.udid} title={`${group.simulator.name} (${group.simulator.runtime})`}>
          {group.applications.map((application) => (
            <XcodeSimulatorApplicationsMenuBarItem key={application.id} application={application} />
          ))}
        </MenuBarExtra.Section>
      ))}
    </MenuBarExtra>
  );
}
