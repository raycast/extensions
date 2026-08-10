import { ReactElement } from "react";
import { Action, ActionPanel, closeMainWindow, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import { openNewTab, setActiveTab } from "../actions";
import { Preferences, SettingsProfileOpenBehaviour, Tab, Workspace } from "../types/interfaces";
import { useCachedState } from "@raycast/utils";
import { DEFAULT_PROFILE_ID } from "../constants";
import { getAppExecutablePath, getCurrentProfileCacheKey } from "../utils/appUtils";
import { execSync } from "child_process";

export class EdgeActions {
  public static NewTab = NewTabActions;
  public static TabList = TabListItemActions;
  public static TabHistory = HistoryItemActions;
  public static Workspace = WorkspaceItemActions;
}

function NewTabActions({ query }: { query?: string }): ReactElement {
  const { openTabInProfile } = getPreferenceValues<Preferences>();
  const [profileCurrent] = useCachedState(getCurrentProfileCacheKey(), DEFAULT_PROFILE_ID);

  return (
    <ActionPanel title="New Tab">
      <Action
        onAction={() => openNewTab({ query, profileCurrent, openTabInProfile })}
        title={query ? `Search "${query}"` : "Open Empty Tab"}
      />
    </ActionPanel>
  );
}

function TabListItemActions({ tab }: { tab: Tab }) {
  return (
    <ActionPanel title={tab.title}>
      <GoToTab tab={tab} />
      <Action.CopyToClipboard title="Copy URL" content={tab.url} />
    </ActionPanel>
  );
}

function HistoryItemActions({
  title,
  url,
  profile: profileOriginal,
}: {
  title: string;
  url: string;
  profile: string;
}): ReactElement {
  const { openTabInProfile } = getPreferenceValues<Preferences>();
  const [profileCurrent] = useCachedState(getCurrentProfileCacheKey(), DEFAULT_PROFILE_ID);

  return (
    <ActionPanel title={title}>
      <Action onAction={() => openNewTab({ url, profileOriginal, profileCurrent, openTabInProfile })} title={"Open"} />
      <ActionPanel.Section title={"Open in profile"}>
        <Action
          onAction={() =>
            openNewTab({
              url,
              profileOriginal,
              profileCurrent,
              openTabInProfile: SettingsProfileOpenBehaviour.ProfileCurrent,
            })
          }
          title={"Open in Current Profile"}
        />
        <Action
          onAction={() =>
            openNewTab({
              url,
              profileOriginal,
              profileCurrent,
              openTabInProfile: SettingsProfileOpenBehaviour.ProfileOriginal,
            })
          }
          title={"Open in Original Profile"}
        />
      </ActionPanel.Section>
      <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
    </ActionPanel>
  );
}

function WorkspaceItemActions({ workspace, profile }: { workspace: Workspace; profile: string }) {
  const launchWorkspace = async (profile: string, workspace: Workspace) => {
    const command = `"${getAppExecutablePath()}" --profile-directory="${profile}" --launch-workspace="${workspace.id}"`;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Launching workspace...",
    });

    try {
      execSync(command);
      toast.style = Toast.Style.Success;
      toast.title = "Workspace launched";
      await closeMainWindow();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to launch workspace";
      toast.message =
        err instanceof Error ? err.message : "An unknown error occurred while trying to launch the workspace";
    }
  };

  return (
    <ActionPanel>
      <Action icon={Icon.Compass} title="Open" onAction={() => launchWorkspace(profile, workspace)} />
      <Action.CopyToClipboard
        content={workspace.connectionUrl}
        title="Copy Share Link"
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
    </ActionPanel>
  );
}

function GoToTab(props: { tab: Tab }) {
  async function handleAction() {
    await setActiveTab(props.tab);
    await closeMainWindow();
  }

  return <Action title="Open Tab" icon={{ source: Icon.Eye }} onAction={handleAction} />;
}
