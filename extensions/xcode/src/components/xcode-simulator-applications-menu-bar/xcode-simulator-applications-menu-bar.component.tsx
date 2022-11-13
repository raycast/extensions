import { usePromise } from "@raycast/utils";
import { Icon, MenuBarExtra } from "@raycast/api";
import { XcodeSimulatorApplicationService } from "../../services/xcode-simulator-application.service";
import { XcodeSimulatorApplicationsMenuBarItem } from "./xcode-simulator-applications-menu-bar-item.component";

/**
 * Xcode Simulator Applications Menu Bar
 */
export function XcodeSimulatorApplicationsMenuBar(): JSX.Element {
  const xcodeSimulatorApplicationsGroups = usePromise(XcodeSimulatorApplicationService.xcodeSimulatorApplicationGroups);
  return (
    <MenuBarExtra isLoading={xcodeSimulatorApplicationsGroups.isLoading} icon={Icon.Mobile}>
      <MenuBarExtra.Section title={"Recent Builds"} />
      {xcodeSimulatorApplicationsGroups.isLoading ? <MenuBarExtra.Item title={"Loading..."} /> : undefined}
      {!xcodeSimulatorApplicationsGroups.isLoading && !xcodeSimulatorApplicationsGroups.data?.length ? (
        <MenuBarExtra.Item title={"No Simulators booted"} />
      ) : undefined}
      <MenuBarExtra.Separator />
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
