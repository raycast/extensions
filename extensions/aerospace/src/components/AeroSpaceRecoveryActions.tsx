import { Action, ActionPanel, Icon, openExtensionPreferences } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { AeroSpaceError, openAeroSpaceApplication } from "../utils/aerospace";

type Props = {
  error: Error;
  onRetry: () => unknown | Promise<unknown>;
};

export function AeroSpaceRecoveryActions({ error, onRetry }: Props) {
  const canOpenApplication = error instanceof AeroSpaceError && error.kind === "server-unavailable";

  return (
    <ActionPanel>
      <Action
        title="Retry"
        icon={Icon.ArrowClockwise}
        onAction={async () => {
          await onRetry();
        }}
      />
      {canOpenApplication && (
        <Action
          title="Open AeroSpace"
          icon={Icon.AppWindow}
          onAction={async () => {
            try {
              await openAeroSpaceApplication();
            } catch (openError) {
              await showFailureToast(openError, { title: "Could Not Open AeroSpace" });
            }
          }}
        />
      )}
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
      <Action.OpenInBrowser
        title="Open AeroSpace Installation Guide"
        url="https://nikitabobko.github.io/AeroSpace/guide#installation"
      />
    </ActionPanel>
  );
}
