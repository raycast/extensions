import { XcodeSimulatorApplication } from "../../models/xcode-simulator/xcode-simulator-application.model";
import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { XcodeSimulatorService } from "../../services/xcode-simulator.service";
import { XcodeSimulatorAppAction } from "../../models/xcode-simulator/xcode-simulator-app-action.model";
import { XcodeSimulatorAppPrivacyAction } from "../../models/xcode-simulator/xcode-simulator-app-privacy-action.model";
import { XcodeSimulatorAppPrivacyServiceType } from "../../models/xcode-simulator/xcode-simulator-app-privacy-service-type.model";
import { XcodeSimulatorAppPrivacyServiceTypeName } from "../../shared/xcode-simulator-app-privacy-service-type-name";
import { XcodeCleanupService } from "../../services/xcode-cleanup.service";

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
      subtitle={props.application.bundleIdentifier}
      accessories={[{ text: `Version: ${props.application.version} (${props.application.buildNumber})` }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section
            title={["Directories", props.application.userDefaultsPlistPath ? "Files" : undefined]
              .filter(Boolean)
              .join(" & ")}
          >
            <Action.ShowInFinder title="Open Documents directory" path={props.application.sandBoxDocumentsPath} />
            <Action.ShowInFinder title="Open Caches directory" path={props.application.sandBoxCachesPath} />
            <Action.ShowInFinder
              title="Open Sandbox directory"
              path={props.application.sandBoxPath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            />
            <Action.ShowInFinder
              title="Open Bundle directory"
              path={props.application.bundlePath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
            />
            {props.application.userDefaultsPlistPath ? (
              <Action.Open
                icon={Icon.Document}
                title="Open User Defaults"
                target={props.application.userDefaultsPlistPath}
                shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
              />
            ) : undefined}
          </ActionPanel.Section>
          <ActionPanel.Section title="Actions">
            <Action
              icon={Icon.Power}
              title="Launch"
              onAction={() =>
                XcodeSimulatorService.app(
                  XcodeSimulatorAppAction.launch,
                  props.application.bundleIdentifier,
                  props.application.simulator
                )
              }
              shortcut={{ modifiers: ["cmd"], key: "l" }}
            />
            <Action
              icon={Icon.Power}
              title="Terminate"
              onAction={() =>
                XcodeSimulatorService.app(
                  XcodeSimulatorAppAction.terminate,
                  props.application.bundleIdentifier,
                  props.application.simulator
                )
              }
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            />
            <Action
              icon={Icon.Trash}
              title="Uninstall"
              style={Action.Style.Destructive}
              onAction={() =>
                XcodeSimulatorService.app(
                  XcodeSimulatorAppAction.uninstall,
                  props.application.bundleIdentifier,
                  props.application.simulator
                )
              }
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            />
            <Action
              icon={Icon.Trash}
              title="Delete Derived Data"
              style={Action.Style.Destructive}
              onAction={() => XcodeCleanupService.removeDerivedData(props.application.name)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Permissions">
            {Object.keys(XcodeSimulatorAppPrivacyAction).map((privacyAction) => (
              <ActionPanel.Submenu
                key={privacyAction}
                title={`${privacyAction.charAt(0).toUpperCase() + privacyAction.slice(1)} Permissions`}
              >
                {Object.keys(XcodeSimulatorAppPrivacyServiceType).map((privacyServiceType) => (
                  <Action
                    key={privacyServiceType}
                    title={XcodeSimulatorAppPrivacyServiceTypeName(
                      XcodeSimulatorAppPrivacyServiceType[
                        privacyServiceType as keyof typeof XcodeSimulatorAppPrivacyServiceType
                      ]
                    )}
                    onAction={() =>
                      XcodeSimulatorService.appPrivacy(
                        XcodeSimulatorAppPrivacyAction[privacyAction as keyof typeof XcodeSimulatorAppPrivacyAction],
                        XcodeSimulatorAppPrivacyServiceType[
                          privacyServiceType as keyof typeof XcodeSimulatorAppPrivacyServiceType
                        ],
                        props.application.bundleIdentifier,
                        props.application.simulator
                      )
                    }
                  />
                ))}
              </ActionPanel.Submenu>
            ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
