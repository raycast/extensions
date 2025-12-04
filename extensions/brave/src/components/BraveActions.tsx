import { ReactElement } from "react";
import { Action, ActionPanel, closeMainWindow, getPreferenceValues, Icon } from "@raycast/api";
import { closeTab, openNewTab, setActiveTab } from "../actions";
import { Preferences, SettingsProfileOpenBehaviour, Tab } from "../interfaces";
import { useCachedState } from "@raycast/utils";
import { BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID } from "../constants";

export class BraveActions {
  public static NewTab = NewTabActions;
  public static TabList = TabListItemActions;
  public static TabHistory = HistoryItemActions;
}

function NewTabActions({ query, incognito }: { query?: string; incognito?: boolean }): ReactElement {
  const { openTabInProfile } = getPreferenceValues<Preferences>();
  const [profileCurrent] = useCachedState(BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID);

  return (
    <ActionPanel title="New Tab">
      <Action
        onAction={() => openNewTab({ query, profileCurrent, openTabInProfile, incognito })}
        title={query ? `Search "${query}"` : "Open New Tab"}
        icon={Icon.Globe}
      />
    </ActionPanel>
  );
}

function TabListItemActions({ tab }: { tab: Tab }) {
  const { openTabInProfile } = getPreferenceValues<Preferences>();
  const [profileCurrent] = useCachedState(BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID);

  return (
    <ActionPanel title={tab.title}>
      <GoToTab tab={tab} />
      <Action
        title="Move To New Window"
        icon={Icon.Window}
        onAction={async () => {
          await closeTab(tab.tabIndex);
          await openNewTab({ url: tab.url, profileCurrent, openTabInProfile, newWindow: true });
        }}
      />
      <Action
        title="Move To Incognito Window"
        icon={Icon.EyeDisabled}
        onAction={async () => {
          await closeTab(tab.tabIndex);
          await openNewTab({ url: tab.url, profileCurrent, openTabInProfile, incognito: true });
        }}
      />
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
  const [profileCurrent] = useCachedState(BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID);

  return (
    <ActionPanel title={title}>
      <Action
        onAction={async () => await openNewTab({ url, profileOriginal, profileCurrent, openTabInProfile })}
        icon={Icon.Eye}
        title="Open"
      />
      <Action
        title="Open In New Window"
        icon={Icon.Window}
        onAction={async () =>
          await openNewTab({ url, profileOriginal, profileCurrent, openTabInProfile, newWindow: true })
        }
      />
      <Action
        title="Open In Incognito Window"
        icon={Icon.EyeDisabled}
        onAction={async () =>
          await openNewTab({ url, profileOriginal, profileCurrent, openTabInProfile, incognito: true })
        }
      />
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
          title={"Open in current profile"}
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
