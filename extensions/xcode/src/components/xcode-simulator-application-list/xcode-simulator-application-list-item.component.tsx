import { XcodeSimulatorApplication } from "../../models/xcode-simulator/xcode-simulator-application.model";
import { Action, ActionPanel, Image, List } from "@raycast/api";

/**
 * Xcode Simulator Application List Item
 */
export function XcodeSimulatorApplicationListItem(props: { application: XcodeSimulatorApplication }): JSX.Element {
  return (
    <List.Item
      key={props.application.id}
      icon={{
        source: props.application.appIconPath ?? "app-icon-placeholder.png",
        mask: Image.Mask.RoundedRectangle,
      }}
      title={props.application.name}
      subtitle={subtitle(props.application)}
      accessories={[{ text: [props.application.simulator.name, `(${props.application.simulator.runtime})`].join(" ") }]}
      actions={
        <ActionPanel>
          <Action.ShowInFinder title="Open Documents directory" path={props.application.sandBoxDocumentsPath} />
          <Action.ShowInFinder title="Open Caches directory" path={props.application.sandBoxCachesPath} />
          <Action.ShowInFinder title="Open Sandbox directory" path={props.application.sandBoxPath} />
          <Action.ShowInFinder title="Open Bundle directory" path={props.application.bundlePath} />
        </ActionPanel>
      }
    />
  );
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
