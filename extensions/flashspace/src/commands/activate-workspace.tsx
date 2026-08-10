import { Action, ActionPanel, closeMainWindow, Icon, Image, List, showHUD } from "@raycast/api";
import { useExec, usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getFlashspacePath, parseLines, runFlashspaceAsync } from "../utils/cli";
import { loadWorkspaceIconsAsync } from "../utils/workspace-icons";

export default function ActivateWorkspace() {
  const flashspace = getFlashspacePath();

  const { isLoading, data } = useExec(flashspace, ["list-workspaces"], {
    parseOutput: ({ stdout }) => parseLines(stdout),
    failureToastOptions: { title: "Failed to list workspaces" },
  });

  const { data: activeWorkspace } = useExec(flashspace, ["get-workspace"], {
    parseOutput: ({ stdout }) => stdout.trim(),
    failureToastOptions: { title: "Failed to get active workspace" },
  });

  // Optimistic display state – updated immediately on activation so the "Active"
  // badge is correct even when Raycast reopens before the useExec query re-runs.
  const [displayedActiveWorkspace, setDisplayedActiveWorkspace] = useState<string>();

  useEffect(() => {
    setDisplayedActiveWorkspace(activeWorkspace);
  }, [activeWorkspace]);

  const { data: activeProfile } = useExec(flashspace, ["get-profile"], {
    parseOutput: ({ stdout }) => stdout.trim(),
    failureToastOptions: { title: "Failed to get active profile" },
  });

  const { data: workspaceIcons = {} as Record<string, Image.ImageLike> } = usePromise(
    (profile: string | undefined): Promise<Record<string, Image.ImageLike>> =>
      profile ? loadWorkspaceIconsAsync(profile) : Promise.resolve({}),
    [activeProfile],
  );

  async function handleActivate(name: string) {
    const previousWorkspace = displayedActiveWorkspace;
    setDisplayedActiveWorkspace(name);
    try {
      await runFlashspaceAsync(["workspace", "--name", name]);
      await showHUD(`Switched to workspace "${name}"`);
      await closeMainWindow();
    } catch {
      setDisplayedActiveWorkspace(previousWorkspace);
      await showHUD(`Failed to activate workspace "${name}"`);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search workspaces...">
      {data?.map((name) => (
        <List.Item
          key={name}
          title={name}
          icon={workspaceIcons[name] || Icon.Window}
          accessories={displayedActiveWorkspace === name ? [{ tag: "Active" }] : []}
          actions={
            <ActionPanel>
              <Action title="Activate Workspace" icon={Icon.ArrowRight} onAction={() => handleActivate(name)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
