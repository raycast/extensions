import { XcodeSimulatorApplication } from "../../models/xcode-simulator/xcode-simulator-application.model";
import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { XcodeSimulatorApplicationListItemDetail } from "./xcode-simulator-application-list-item-detail.component";
import { XcodeSimulatorService } from "../../services/xcode-simulator.service";

/**
 * Xcode Simulator Application List Item
 */
export function XcodeSimulatorApplicationListItem(props: { application: XcodeSimulatorApplication }): JSX.Element {
  return (
    <List.Item
      icon={{
        source: props.application.appIconPath ?? "app-icon-placeholder.png",
        mask: Image.Mask.RoundedRectangle,
      }}
      title={props.application.name}
      detail={<XcodeSimulatorApplicationListItemDetail application={props.application} />}
      actions={
        <ActionPanel>
          <Action.ShowInFinder title="Open Documents directory" path={props.application.sandBoxDocumentsPath} />
          <Action.ShowInFinder title="Open Caches directory" path={props.application.sandBoxCachesPath} />
          <Action.ShowInFinder title="Open Sandbox directory" path={props.application.sandBoxPath} />
          <Action.ShowInFinder title="Open Bundle directory" path={props.application.bundlePath} />
          <Action
            icon={Icon.Power}
            title="Launch"
            onAction={() =>
              XcodeSimulatorService.launchApp(props.application.bundleIdentifier, props.application.simulator)
            }
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
        </ActionPanel>
      }
    />
  );
}
