import { Action, ActionPanel, BrowserExtension, environment } from "@raycast/api";
import { isWindows } from "./util/platform";
import { getPreferenceValues, List } from "@raycast/api";
import { BraveListItems } from "./components";
import { useTabSearch } from "./hooks/useTabSearch";

export default function Command() {
  const { useOriginalFavicon } = getPreferenceValues<Preferences>();
  const { data, isLoading, errorView } = useTabSearch();

  if (errorView) {
    return errorView;
  }

  return (
    <List isLoading={isLoading} filtering={true}>
      {isWindows && !environment.canAccess(BrowserExtension) && (
        <List.EmptyView
          title="Connect the Raycast Browser Extension"
          description="Install the Raycast browser extension in Brave to search open tabs."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Get Browser Extension" url="https://raycast.com/browser-extension" />
            </ActionPanel>
          }
        />
      )}
      {data?.map((tab) => (
        <BraveListItems.TabList key={tab.key()} tab={tab} useOriginalFavicon={useOriginalFavicon} />
      ))}
    </List>
  );
}
