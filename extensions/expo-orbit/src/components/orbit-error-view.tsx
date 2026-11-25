import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { ORBIT_DOWNLOAD_URL, OrbitNotInstalledError } from "../lib/orbit";

export const ORBIT_BREW_COMMAND = "brew install --cask expo-orbit";

/** Explains why devices couldn't load, with the action that fixes it. */
export function OrbitErrorView(props: { error: Error; onRetry: () => void }) {
  if (props.error instanceof OrbitNotInstalledError) {
    return (
      <List.EmptyView
        icon={Icon.Download}
        title="Install Expo Orbit"
        description={`This extension uses Expo Orbit to manage devices. Download it from expo.dev/orbit or run "${ORBIT_BREW_COMMAND}".`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Download Expo Orbit" url={ORBIT_DOWNLOAD_URL} />
            <Action.CopyToClipboard title="Copy Homebrew Command" content={ORBIT_BREW_COMMAND} />
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={props.onRetry} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List.EmptyView
      icon={Icon.Warning}
      title="Couldn't Load Devices"
      description={props.error.message}
      actions={
        <ActionPanel>
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={props.onRetry} />
          <Action.CopyToClipboard title="Copy Error" content={props.error.message} />
        </ActionPanel>
      }
    />
  );
}
