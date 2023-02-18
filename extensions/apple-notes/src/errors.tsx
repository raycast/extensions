import { ActionPanel, Detail, Icon, Action, environment, showHUD } from "@raycast/api";
import path from "path";
import fileUrl from "file-url";

type PermissionErrorTypes = "fullDiskAccess" | "accessibility" | "unknown";

export class PermissionError extends Error {
  type: PermissionErrorTypes;

  constructor(message: string, type: PermissionErrorTypes) {
    super(message);
    this.name = "PermissionError";
    this.type = type;
  }
}

export const isFullDiskAccessPermissionError = (error: unknown) => {
  return error instanceof Error && error.name === "PermissionError";
};

export const isAccessibilityPermissionError = (error: unknown) => {
  return error instanceof Error && error.message.includes("1002");
};

type PreferenceTarget = {
  [index in PermissionErrorTypes]: string;
};
type SpecificDescription = {
  [index in PermissionErrorTypes]: string;
};

const permissionName: SpecificDescription = {
  fullDiskAccess: "Full Disk Access",
  accessibility: "Accessibility",
  unknown: "Corresponding",
};
const permissionAsset: SpecificDescription = {
  fullDiskAccess: "full-disk-access.png",
  accessibility: "accessibility.png",
  unknown: "unknown-privacy.png",
};

// @TODO: This screen should be handled by Raycast itself (https://github.com/raycast/extensions/issues/101)
const fullDiskAccessErrorMarkdown = (errorType: PermissionErrorTypes) => {
  return `## Raycast needs ${permissionName[errorType]} permission in order to display your Apple Notes.

![Full Disk Access Preferences Pane](${fileUrl(path.join(environment.assetsPath, permissionAsset[errorType]))})

1. Open the **Security & Privacy** tab under System Settings
2. Select **${permissionName[errorType]}** from the sidebar
3. Toggle on **Raycast** in the list. If Raycast is not in the list, Drag and Drop the icon for the **Raycast** application into it 
4. Enter your macOS administrator password`;
};

const preferencePaneTargets: PreferenceTarget = {
  fullDiskAccess: "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles",
  accessibility: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
  unknown: "x-apple.systempreferences:com.apple.preference.security",
};

const OpenPrivacyPreferencePaneAction = (props: { target: string }) => (
  <Action.Open title="Open System Preferences" icon={Icon.Gear} target={props.target} />
);

const Actions = (props: { errorType: PermissionErrorTypes }) => (
  <ActionPanel>
    <OpenPrivacyPreferencePaneAction target={preferencePaneTargets[props.errorType]} />
  </ActionPanel>
);

export const PermissionErrorScreen = (props: { errorType: PermissionErrorTypes } = { errorType: "unknown" }) => (
  <Detail markdown={fullDiskAccessErrorMarkdown(props.errorType)} actions={<Actions errorType={props.errorType} />} />
);

export const showPermissionErrorHUD = async (errorType: PermissionErrorTypes) => {
  showHUD(`Please grant Raycast ${permissionName[errorType]} permission`);
};
