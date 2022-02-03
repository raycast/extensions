import { XcodeSimulatorApplication } from "../../models/simulator/xcode-simulator-application.model";
import { ActionPanel, Icon, ImageLike, ImageMask, List, Navigation, ShowInFinderAction } from "@raycast/api";
import { xcodeSimulatorApplicationDetail } from "./xcode-simulator-application-detail.user-interface";

/**
 * Xcode Simulator Application List Item
 * @param xcodeSimulatorApplication The XcodeSimulatorApplication
 * @param navigation The Navigation
 */
export function xcodeSimulatorApplicationListItem(
  xcodeSimulatorApplication: XcodeSimulatorApplication,
  navigation: Navigation
): JSX.Element {
  return (
    <List.Item
      key={key(xcodeSimulatorApplication)}
      icon={icon(xcodeSimulatorApplication)}
      title={xcodeSimulatorApplication.name}
      subtitle={subtitle(xcodeSimulatorApplication)}
      accessoryTitle={accessoryTitle(xcodeSimulatorApplication)}
      actions={
        <ActionPanel>
          <ActionPanel.Item
            icon={Icon.Finder}
            title="View Directories"
            onAction={() => navigation.push(xcodeSimulatorApplicationDetail(xcodeSimulatorApplication, navigation))}
          />
          <ShowInFinderAction
            title={"Open Documents directory"}
            path={xcodeSimulatorApplication.sandBoxDocumentsPath}
          />
        </ActionPanel>
      }
    />
  );
}

/**
 * Retrieve key from XcodeSimulatorApplication
 * @param xcodeSimulatorApplication The XcodeSimulatorApplication
 */
function key(xcodeSimulatorApplication: XcodeSimulatorApplication): string {
  return [xcodeSimulatorApplication.simulator.udid, xcodeSimulatorApplication.bundleIdentifier].join("/");
}

/**
 * Retrieve icon from XcodeSimulatorApplication
 * @param xcodeSimulatorApplication The XcodeSimulatorApplication
 */
function icon(xcodeSimulatorApplication: XcodeSimulatorApplication): ImageLike {
  // Use rounded appIconPath image otherwise use placeholder icon
  return {
    source: xcodeSimulatorApplication.appIconPath ?? "app-icon-placeholder.png",
    mask: ImageMask.RoundedRectangle,
  };
}

/**
 * Retrieve subtitle from XcodeSimulatorApplication
 * @param xcodeSimulatorApplication The XcodeSimulatorApplication
 */
function subtitle(xcodeSimulatorApplication: XcodeSimulatorApplication): string {
  // Initialize subtitle component with the application bundle identifier
  const subtitleComponents: string[] = [xcodeSimulatorApplication.bundleIdentifier];
  // Check if a version is available
  if (xcodeSimulatorApplication.version) {
    // Push version
    subtitleComponents.push(`Version: ${xcodeSimulatorApplication.version}`);
  }
  // Check if a build number is available
  if (xcodeSimulatorApplication.buildNumber) {
    // Push build number
    subtitleComponents.push(`Build: ${xcodeSimulatorApplication.buildNumber}`);
  }
  // Join subtitle components with a pipe
  return subtitleComponents.join(" | ");
}

/**
 * Retrieve accessory title from XcodeSimulatorApplication
 * @param xcodeSimulatorApplication The XcodeSimulatorApplication
 */
function accessoryTitle(xcodeSimulatorApplication: XcodeSimulatorApplication): string {
  return [xcodeSimulatorApplication.simulator.name, `(${xcodeSimulatorApplication.simulator.runtime})`].join(" ");
}
