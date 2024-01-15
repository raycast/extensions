import { XcodeSimulatorApplication } from "../../models/xcode-simulator/xcode-simulator-application.model";
import { Clipboard, Color, Icon, Image, MenuBarExtra, open, showHUD } from "@raycast/api";
import { XcodeSimulatorService } from "../../services/xcode-simulator.service";
import { XcodeSimulatorAppAction } from "../../models/xcode-simulator/xcode-simulator-app-action.model";
import { XcodeSimulatorAppPrivacyAction } from "../../models/xcode-simulator/xcode-simulator-app-privacy-action.model";
import { XcodeSimulatorAppPrivacyServiceType } from "../../models/xcode-simulator/xcode-simulator-app-privacy-service-type.model";
import { XcodeSimulatorAppPrivacyServiceTypeName } from "../../shared/xcode-simulator-app-privacy-service-type-name";
import { XcodeCleanupService } from "../../services/xcode-cleanup.service";

/**
 * Xcode Simulator Applications Menu Bar Item
 */
export function XcodeSimulatorApplicationsMenuBarItem(props: { application: XcodeSimulatorApplication }) {
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
                appPrivacyAction(
                  XcodeSimulatorAppPrivacyAction[privacyAction as keyof typeof XcodeSimulatorAppPrivacyAction],
                  XcodeSimulatorAppPrivacyServiceType[
                    privacyServiceType as keyof typeof XcodeSimulatorAppPrivacyServiceType
                  ],
                  props.application
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
        onAction={(event) => openOrCopyToClipboard(props.application.bundlePath, event.type)}
      />
      {props.application.appGroupPath ? (
        <MenuBarExtra.Item
          icon={{ source: Icon.Folder, tintColor: Color.Blue }}
          title="App Group"
          onAction={(event) => openOrCopyToClipboard(props.application.appGroupPath as string, event.type)}
        />
      ) : undefined}
      <MenuBarExtra.Item
        icon={{ source: Icon.Folder, tintColor: Color.Blue }}
        title="Sandbox User Data"
        onAction={(event) => openOrCopyToClipboard(props.application.sandBoxPath, event.type)}
      />
      <MenuBarExtra.Item
        icon={{ source: Icon.Folder, tintColor: Color.Blue }}
        title="Caches"
        onAction={(event) => openOrCopyToClipboard(props.application.sandBoxCachesPath, event.type)}
      />
      <MenuBarExtra.Item
        icon={{ source: Icon.Folder, tintColor: Color.Blue }}
        title="Documents"
        onAction={(event) => openOrCopyToClipboard(props.application.sandBoxDocumentsPath, event.type)}
      />
      {props.application.userDefaultsPlistPath ? (
        <MenuBarExtra.Item
          icon={Icon.Document}
          title="User Defaults"
          onAction={(event) =>
            props.application.userDefaultsPlistPath
              ? openOrCopyToClipboard(props.application.userDefaultsPlistPath, event.type)
              : undefined
          }
        />
      ) : undefined}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title={"Launch"}
        onAction={() => simulatorAppAction(XcodeSimulatorAppAction.launch, props.application)}
      />
      <MenuBarExtra.Item
        title={"Terminate"}
        onAction={() => simulatorAppAction(XcodeSimulatorAppAction.terminate, props.application)}
      />
      <MenuBarExtra.Item
        title={"Uninstall"}
        onAction={() => simulatorAppAction(XcodeSimulatorAppAction.uninstall, props.application)}
      />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title={`Delete Derived Data for ${props.application.name}`}
        onAction={() => deleteDerivedData(props.application)}
      />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item title={`Version: ${props.application.version} (${props.application.buildNumber})`} />
      <MenuBarExtra.Item title={props.application.bundleIdentifier} />
    </MenuBarExtra.Submenu>
  );
}

/**
 * Perform a Xcode Simulator App Privacy Action
 * @param action The XcodeSimulatorAppPrivacyAction to perform
 * @param serviceType The XcodeSimulatorAppPrivacyServiceType
 * @param application The XcodeSimulatorApplication
 */
async function appPrivacyAction(
  action: XcodeSimulatorAppPrivacyAction,
  serviceType: XcodeSimulatorAppPrivacyServiceType,
  application: XcodeSimulatorApplication
) {
  try {
    await XcodeSimulatorService.appPrivacy(action, serviceType, application.bundleIdentifier, application.simulator);
  } catch {
    return await showHUD(`Failed to ${action} ${XcodeSimulatorAppPrivacyServiceTypeName(serviceType)}`);
  }
  let actionTitle: string;
  switch (action) {
    case XcodeSimulatorAppPrivacyAction.grant:
      actionTitle = "Granted";
      break;
    case XcodeSimulatorAppPrivacyAction.revoke:
      actionTitle = "Revoked";
      break;
    case XcodeSimulatorAppPrivacyAction.reset:
      actionTitle = "Reset";
      break;
  }
  await showHUD(
    `${application.simulator.name}: ${actionTitle} ${XcodeSimulatorAppPrivacyServiceTypeName(
      serviceType
    )} permissions for ${application.name}`
  );
}

/**
 * Open or copy path to clipboard
 * @param path The path to open or copy to clipboard
 * @param event The event left-click: open | right-click: copy to clipboard
 */
async function openOrCopyToClipboard(path: string, event: "left-click" | "right-click") {
  if (event === "left-click") {
    try {
      await open(path, "com.apple.Finder");
    } catch {
      await showHUD(`Failed to open ${path}`);
    }
  } else {
    await Clipboard.copy(path);
    await showHUD("Copied to Clipboard");
  }
}

/**
 * Perform a Xcode Simulator App Action
 * @param action The XcodeSimulatorAppAction to perform
 * @param application The XcodeSimulatorApplication
 */
async function simulatorAppAction(action: XcodeSimulatorAppAction, application: XcodeSimulatorApplication) {
  try {
    await XcodeSimulatorService.app(action, application.bundleIdentifier, application.simulator);
  } catch {
    let actionTitle: string;
    switch (action) {
      case XcodeSimulatorAppAction.launch:
        actionTitle = "launching";
        break;
      case XcodeSimulatorAppAction.terminate:
        actionTitle = "terminating";
        break;
      case XcodeSimulatorAppAction.uninstall:
        actionTitle = "uninstalling";
        break;
    }
    await showHUD(`An error occurred while ${actionTitle} ${application.name} on ${application.simulator.name}`);
  }
}

/**
 * Delete derived data for a given Xcode Simulator Application
 * @param application The XcodeSimulatorApplication
 */
async function deleteDerivedData(application: XcodeSimulatorApplication) {
  try {
    await XcodeCleanupService.removeDerivedData(application.name);
  } catch {
    return showHUD(`Failed to delete derived data for ${application.name}`);
  }
  await showHUD(`Removed derived data for ${application.name}`);
}
