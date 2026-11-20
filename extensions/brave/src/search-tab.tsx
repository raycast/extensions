import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { isWindows } from "./util/platform";
import { BraveListItems } from "./components";
import { useTabSearch } from "./hooks/useTabSearch";
import { openNewTab } from "./actions";
import { SettingsProfileOpenBehaviour } from "./interfaces";
import { DEFAULT_BRAVE_PROFILE_ID } from "./constants";

const BROWSER_EXTENSION_URL = "https://www.raycast.com/browser-extension";

export default function Command() {
  const { useOriginalFavicon } = getPreferenceValues<Preferences>();
  const { data, isLoading, errorView, revalidate } = useTabSearch();

  if (errorView) {
    return errorView;
  }

  return (
    <List isLoading={isLoading} filtering={true}>
      {isWindows && !isLoading && (data?.length ?? 0) === 0 && (
        <List.EmptyView
          icon={Icon.Window}
          title="No Tabs Found"
          description="Make sure Brave has open tabs and the Raycast browser extension is connected."
          actions={
            <ActionPanel>
              <Action
                title="Get Raycast Browser Extension"
                icon={Icon.Download}
                onAction={() =>
                  openNewTab({
                    url: BROWSER_EXTENSION_URL,
                    profileCurrent: DEFAULT_BRAVE_PROFILE_ID,
                    openTabInProfile: SettingsProfileOpenBehaviour.Default,
                  })
                }
              />
              <Action.CopyToClipboard title="Copy Link" content={BROWSER_EXTENSION_URL} />
            </ActionPanel>
          }
        />
      )}
      {data?.map((tab) => (
        <BraveListItems.TabList
          key={tab.key()}
          tab={tab}
          useOriginalFavicon={useOriginalFavicon}
          revalidate={revalidate}
        />
      ))}
    </List>
  );
}
