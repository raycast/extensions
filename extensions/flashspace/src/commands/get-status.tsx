import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { useExec, usePromise } from "@raycast/utils";
import { getFlashspacePath } from "../utils/cli";
import { buildStatusItems } from "../utils/status";
import { loadWorkspaceIconsAsync } from "../utils/workspace-icons";
import ListApps from "./list-apps";
import ListProfiles from "./list-profiles";
import ListWorkspaces from "./list-workspaces";

export default function GetStatus() {
  const flashspace = getFlashspacePath();

  const { data: activeProfile, isLoading: loadingProfile } = useExec(flashspace, ["get-profile"], {
    parseOutput: ({ stdout }) => stdout.trim(),
    failureToastOptions: { title: "Failed to get active profile" },
  });

  const { data: activeWorkspace, isLoading: loadingWorkspace } = useExec(flashspace, ["get-workspace"], {
    parseOutput: ({ stdout }) => stdout.trim(),
    failureToastOptions: { title: "Failed to get active workspace" },
  });

  const { data: activeApp, isLoading: loadingApp } = useExec(flashspace, ["get-app"], {
    parseOutput: ({ stdout }) => stdout.trim(),
    failureToastOptions: { title: "Failed to get active app" },
  });

  const { data: activeDisplay, isLoading: loadingDisplay } = useExec(flashspace, ["get-display"], {
    parseOutput: ({ stdout }) => stdout.trim(),
    failureToastOptions: { title: "Failed to get active display" },
  });

  const isLoading = loadingProfile || loadingWorkspace || loadingApp || loadingDisplay;
  const { data: workspaceIcons = {} as Record<string, Image.ImageLike> } = usePromise(
    (profile: string | undefined): Promise<Record<string, Image.ImageLike>> =>
      profile ? loadWorkspaceIconsAsync(profile) : Promise.resolve({}),
    [activeProfile],
  );
  const statusItems = buildStatusItems({ activeProfile, activeWorkspace, activeApp, activeDisplay });
  const [profileItem, workspaceItem, appItem, displayItem] = statusItems;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search status...">
      <List.Item
        title={profileItem.title}
        subtitle={profileItem.value}
        icon={Icon.Person}
        actions={
          <ActionPanel>
            <Action.Push title="Open Profiles" target={<ListProfiles />} />
            <Action.CopyToClipboard title="Copy Value" content={profileItem.value} />
          </ActionPanel>
        }
      />
      <List.Item
        title={workspaceItem.title}
        subtitle={workspaceItem.value}
        icon={(activeWorkspace && workspaceIcons[activeWorkspace]) || Icon.Window}
        actions={
          <ActionPanel>
            <Action.Push title="Open Workspaces" target={<ListWorkspaces />} />
            <Action.CopyToClipboard title="Copy Value" content={workspaceItem.value} />
          </ActionPanel>
        }
      />
      <List.Item
        title={appItem.title}
        subtitle={appItem.value}
        icon={Icon.AppWindow}
        actions={
          <ActionPanel>
            <Action.Push title="Open Workspace Apps" target={<ListApps />} />
            <Action.CopyToClipboard title="Copy Value" content={appItem.value} />
          </ActionPanel>
        }
      />
      <List.Item
        title={displayItem.title}
        subtitle={displayItem.value}
        icon={Icon.Monitor}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Value" content={displayItem.value} />
          </ActionPanel>
        }
      />
    </List>
  );
}
