// Import necessary modules and functions from external libraries and Raycast API
import { ActionPanel, Detail, Icon, Action, environment, showHUD } from "@raycast/api";
import path from "path";
import fileUrl from "file-url";

// TODO: This function should be handled by Raycast itself (https://github.com/raycast/extensions/issues/101)

// Define a union type to represent different permission error types
export type PermissionErrorTypes = "fullDiskAccess" | "accessibility" | "unknown";

// Define a custom PermissionError class that extends the built-in Error class
export class PermissionError extends Error {
  type: PermissionErrorTypes;

  constructor(message: string, type: PermissionErrorTypes) {
    super(message);
    this.name = "PermissionError";
    this.type = type;
  }
}

// Define a function to determine the type of a permission error based on the error object
export const testPermissionErrorType = (error: unknown): PermissionErrorTypes => {
  // Check if the error is not an instance of the built-in Error class, return "unknown" if not
  if (!(error instanceof Error)) {
    return "unknown";
  }

  // Check if the error is an instance of PermissionError and its type is "fullDiskAccess"
  if (error instanceof PermissionError && error.type === "fullDiskAccess") {
    return "fullDiskAccess";
  }

  // Check if the error message includes "1002", return "accessibility" if true
  if (error.message.includes("1002")) {
    return "accessibility";
  }

  // If none of the conditions above are met, return "unknown"
  return "unknown";
};

// Define types for mapping permission error types to corresponding values
type PreferenceTarget = {
  [index in PermissionErrorTypes]: string;
};
type SpecificDescription = {
  [index in PermissionErrorTypes]: string;
};

// Define descriptions for each permission error type
const permissionName: SpecificDescription = {
  fullDiskAccess: "Full Disk Access",
  accessibility: "Accessibility",
  unknown: "Corresponding",
};

// Define asset filenames for each permission error type
const permissionAsset: SpecificDescription = {
  fullDiskAccess: "full-disk-access.png",
  accessibility: "accessibility.png",
  unknown: "unknown-privacy.png",
};

// Define target URLs for opening macOS System Preferences for each permission error type
const preferencePaneTargets: PreferenceTarget = {
  fullDiskAccess: "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles",
  accessibility: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
  unknown: "x-apple.systempreferences:com.apple.preference.security",
};

// Define a function to generate a Markdown error message for full disk access permission errors
const fullDiskAccessErrorMarkdown = (errorType: PermissionErrorTypes) => {
  return `## Raycast needs ${permissionName[errorType]} permission in order to display your Apple Notes.

![Full Disk Access Preferences Pane](${fileUrl(path.join(environment.assetsPath, permissionAsset[errorType]))})

1. Open the **Security & Privacy** tab under System Settings
2. Select **${permissionName[errorType]}** from the sidebar
3. Toggle on **Raycast** in the list. If Raycast is not in the list, Drag and Drop the icon for the **Raycast** application into it 
4. Enter your macOS administrator password`;
};

// Define an action component to open the System Preferences pane for privacy settings
const OpenPrivacyPreferencePaneAction = (props: { target: string }) => (
  <Action.Open title="Open System Preferences" icon={Icon.Gear} target={props.target} />
);

// Define an action panel component that includes the action to open the privacy preference pane
const Actions = (props: { errorType: PermissionErrorTypes }) => (
  <ActionPanel>
    <OpenPrivacyPreferencePaneAction target={preferencePaneTargets[props.errorType]} />
  </ActionPanel>
);

// Define a PermissionErrorScreen component that displays the error message and actions
export const PermissionErrorScreen = (props: { errorType: PermissionErrorTypes } = { errorType: "unknown" }) => (
  <Detail markdown={fullDiskAccessErrorMarkdown(props.errorType)} actions={<Actions errorType={props.errorType} />} />
);

// Define a function to show a Heads-Up Display (HUD) message for permission errors
export const showPermissionErrorHUD = async (errorType: PermissionErrorTypes) => {
  showHUD(`Please grant Raycast ${permissionName[errorType]} permission`);
};
