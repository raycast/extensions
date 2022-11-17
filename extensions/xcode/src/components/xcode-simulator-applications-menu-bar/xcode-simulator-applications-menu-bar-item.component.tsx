import { XcodeSimulatorApplication } from "../../models/xcode-simulator/xcode-simulator-application.model";
import { Clipboard, Color, Icon, Image, MenuBarExtra, open } from "@raycast/api";
import { XcodeSimulatorService } from "../../services/xcode-simulator.service";
import { XcodeSimulatorAppAction } from "../../models/xcode-simulator/xcode-simulator-app-action.model";
import { XcodeSimulatorAppPrivacyAction } from "../../models/xcode-simulator/xcode-simulator-app-privacy-action.model";
import { XcodeSimulatorAppPrivacyServiceType } from "../../models/xcode-simulator/xcode-simulator-app-privacy-service-type.model";
import { XcodeSimulatorAppPrivacyServiceTypeName } from "../../shared/xcode-simulator-app-privacy-service-type-name";
import { XcodeCleanupService } from "../../services/xcode-cleanup.service";

/**
 * Xcode Simulator Applications Menu Bar Item
 */
export function XcodeSimulatorApplicationsMenuBarItem(props: { application: XcodeSimulatorApplication }): JSX.Element {
  return (
    <MenuBarExtra.Submenu
      icon={{ source: props.application.appIconPath ?? "app-icon-placeholder.png", mask: Image.Mask.RoundedRectangle }}
      title={props.application.name}
    >
      {Object.keys(XcodeSimulatorAppPrivacyAction).map((privacyAction) => (
        <MenuBarExtra.Submenu
          key={privacyAction}
          title={`${privacyAction.charAt(0).toUpperCase() + privacyAction.slice(1)} Permissions`}
        >
          {Object.keys(XcodeSimulatorAppPrivacyServiceType).map((privacyServiceType) => (
            <MenuBarExtra.Item
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
        </MenuBarExtra.Submenu>
      ))}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        icon={{ source: Icon.Folder, tintColor: Color.Blue }}
        title="Application Bundle (.app)"
        onAction={(event) =>
          event.type === "left-click"
            ? open(props.application.bundlePath)
            : Clipboard.paste(props.application.bundlePath)
        }
      />
      <MenuBarExtra.Item
        icon={{ source: Icon.Folder, tintColor: Color.Blue }}
        title="Sandbox User Data"
        onAction={(event) =>
          event.type === "left-click"
            ? open(props.application.sandBoxPath)
            : Clipboard.paste(props.application.sandBoxPath)
        }
      />
      <MenuBarExtra.Item
        icon={{ source: Icon.Folder, tintColor: Color.Blue }}
        title="Caches"
        onAction={(event) =>
          event.type === "left-click"
            ? open(props.application.sandBoxCachesPath)
            : Clipboard.paste(props.application.sandBoxCachesPath)
        }
      />
      <MenuBarExtra.Item
        icon={{ source: Icon.Folder, tintColor: Color.Blue }}
        title="Documents"
        onAction={(event) =>
          event.type === "left-click"
            ? open(props.application.sandBoxDocumentsPath)
            : Clipboard.paste(props.application.sandBoxDocumentsPath)
        }
      />
      {props.application.userDefaultsPlistPath ? (
        <MenuBarExtra.Item
          icon={Icon.Document}
          title="User Defaults"
          onAction={(event) =>
            props.application.userDefaultsPlistPath
              ? event.type === "left-click"
                ? open(props.application.userDefaultsPlistPath)
                : Clipboard.paste(props.application.userDefaultsPlistPath)
              : undefined
          }
        />
      ) : undefined}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title={"Launch"}
        onAction={() =>
          XcodeSimulatorService.app(
            XcodeSimulatorAppAction.launch,
            props.application.bundleIdentifier,
            props.application.simulator
          )
        }
      />
      <MenuBarExtra.Item
        title={"Terminate"}
        onAction={() =>
          XcodeSimulatorService.app(
            XcodeSimulatorAppAction.terminate,
            props.application.bundleIdentifier,
            props.application.simulator
          )
        }
      />
      <MenuBarExtra.Item
        title={"Uninstall"}
        onAction={() =>
          XcodeSimulatorService.app(
            XcodeSimulatorAppAction.uninstall,
            props.application.bundleIdentifier,
            props.application.simulator
          )
        }
      />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title={`Delete Derived Data for ${props.application.name}`}
        onAction={() => XcodeCleanupService.removeDerivedData(props.application.name)}
      />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item title={`Version: ${props.application.version} (${props.application.buildNumber})`} />
      <MenuBarExtra.Item title={props.application.bundleIdentifier} />
    </MenuBarExtra.Submenu>
  );
}
