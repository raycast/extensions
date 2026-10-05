import { Action, ActionPanel, environment, Icon, launchCommand, LaunchType, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";

export default function Command() {
  const started = useRef(false);
  const [isLoading, setLoading] = useState(false);
  async function pick() {
    setLoading(true);
    try {
      await launchCommand({
        name: "pick-color",
        type: LaunchType.UserInitiated,
        ownerOrAuthorName: "thomas",
        extensionName: "color-picker",
        context: {
          copyToClipboard: false,
          callbackLaunchOptions: {
            name: "find-art-by-color",
            type: LaunchType.UserInitiated,
            extensionName: environment.extensionName,
            ownerOrAuthorName: environment.ownerOrAuthorName,
          },
        },
      });
    } catch (error) {
      await showFailureToast(error, {
        title: "Could not open Color Picker",
        message: "Install Color Picker by Thomas Paul Mann, then try again.",
      });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!started.current) {
      started.current = true;
      void pick();
    }
  }, []);
  return (
    <List isLoading={isLoading}>
      <List.EmptyView
        icon={Icon.EyeDropper}
        title="Pick a Color to Find Art"
        description="Uses Color Picker by Thomas Paul Mann. Select a pixel to open matching artworks, or press Escape to cancel the picker."
        actions={
          <ActionPanel>
            <Action title="Pick Color" icon={Icon.EyeDropper} onAction={pick} />
            <Action.OpenInBrowser title="Install Color Picker" url="https://www.raycast.com/thomas/color-picker" />
            <Action
              title="Enter Color Manually"
              icon={Icon.MagnifyingGlass}
              onAction={() => launchCommand({ name: "find-art-by-color", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
