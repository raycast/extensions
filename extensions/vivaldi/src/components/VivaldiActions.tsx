import { ReactElement } from "react";
import { Action, ActionPanel, closeMainWindow, getPreferenceValues, Icon } from "@raycast/api";
import { openNewTab, setActiveTab } from "../actions";
import { Preferences, SettingsProfileOpenBehaviour, Tab } from "../interfaces";
import { VIVALDI_PROFILE_KEY, DEFAULT_VIVALDI_PROFILE_ID } from "../constants";
import { useCachedState } from "@raycast/utils";

export class VivaldiActions {
  public static NewTab = NewTabActions;
  public static TabList = TabListItemActions;
  public static TabHistory = HistoryItemActions;
}

function NewTabActions({ query }: { query?: string }): ReactElement {
  const { openTabInProfile } = getPreferenceValues<Preferences>();
  const [profileCurrent] = useCachedState(VIVALDI_PROFILE_KEY, DEFAULT_VIVALDI_PROFILE_ID);

  return (
    <ActionPanel title="New Tab">
      <ActionPanel.Item
        onAction={() => openNewTab({ query, profileCurrent, openTabInProfile })}
        title={query ? `Search "${query}"` : "Open Empty Tab"}
        icon={Icon.Globe}
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
  const [profileCurrent] = useCachedState(VIVALDI_PROFILE_KEY, DEFAULT_VIVALDI_PROFILE_ID);

  return (
    <ActionPanel title={title}>
      <ActionPanel.Item
        onAction={() => openNewTab({ url, profileOriginal, profileCurrent, openTabInProfile })}
        title={"Open"}
      />
      <ActionPanel.Section title={"Open in profile"}>
        <ActionPanel.Item
          onAction={() =>
            openNewTab({
              url,
              profileOriginal,
              profileCurrent,
              openTabInProfile: SettingsProfileOpenBehaviour.ProfileCurrent,
            })
          }
          title={"Open in current profile"}
        />
        <ActionPanel.Item
          onAction={() =>
            openNewTab({
              url,
              profileOriginal,
              profileCurrent,
              openTabInProfile: SettingsProfileOpenBehaviour.ProfileOriginal,
            })
          }
          title={"Open in original profile"}
        />
      </ActionPanel.Section>
      <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
    </ActionPanel>
  );
}

function GoToTab(props: { tab: Tab }) {
  async function handleAction() {
    await setActiveTab(props.tab);
    await closeMainWindow();
  }

  return <ActionPanel.Item title="Open Tab" icon={{ source: Icon.Eye }} onAction={handleAction} />;
}
