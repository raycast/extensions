import { Action, ActionPanel, Detail, Icon, Toast, showToast } from "@raycast/api";
import { useCallback, useState } from "react";

import { clearManagedConfiguration } from "./plex";
import { PlexSetupView } from "./plex-setup-view";
import { PreferencesAction } from "./shared-ui";

export default function Command() {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);

  const disconnect = useCallback(async () => {
    setIsDisconnecting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Disconnecting from Plex...",
    });

    try {
      await clearManagedConfiguration();
      toast.style = Toast.Style.Success;
      toast.title = "Disconnected from Plex";
      setIsDisconnected(true);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not disconnect from Plex";
      toast.message = error instanceof Error ? error.message : String(error);
      setIsDisconnecting(false);
    }
  }, []);

  if (isDisconnected) {
    return <PlexSetupView navigationTitle="Disconnect from Plex" />;
  }

  return (
    <Detail
      isLoading={isDisconnecting}
      navigationTitle="Disconnect from Plex"
      markdown={[
        "# Disconnect from Plex",
        "",
        "This will remove the saved Plex sign-in, selected server, and selected music library for this extension.",
        "",
        "Press `cmd+return` to disconnect.",
      ].join("\n")}
      actions={
        <ActionPanel>
          <Action
            title="Confirm Disconnect"
            icon={Icon.XMarkCircle}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={() => void disconnect()}
          />
          <PreferencesAction />
        </ActionPanel>
      }
    />
  );
}
