import { Action, ActionPanel, closeMainWindow, Icon, launchCommand, LaunchType, List, showFailureToast } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { switchToSpace } from "./applescript";
import { ConfigureSpacesLaunchContext, Space } from "./types";

export default function SwitchSpace() {
  const { value: spaces, isLoading } = useLocalStorage<Space[]>("spaces", []);

  return (
    <List isLoading={isLoading}>
      <List.EmptyView title="No spaces configured" description="Use 'Configure Spaces' command to add spaces." />
      {(spaces || []).map((space) => (
        <List.Item
          key={space.index}
          icon={space.icon || Icon.Monitor}
          title={space.name}
          subtitle={`Desktop ${space.index}`}
          actions={
            <ActionPanel>
              <Action
                title="Switch to Space"
                icon={Icon.ArrowRight}
                onAction={async () => {
                  try {
                    await switchToSpace(space.index);
                    await closeMainWindow();
                  } catch (error) {
                    showFailureToast(error, { title: "Failed to switch space" });
                  }
                }}
              />
              <Action
                title="Configure Space"
                icon={Icon.Cog}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                onAction={async () => {
                  const context: ConfigureSpacesLaunchContext = { spaceIndex: space.index };
                  await launchCommand({
                    name: "configure-spaces",
                    type: LaunchType.UserInitiated,
                    context,
                  });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
