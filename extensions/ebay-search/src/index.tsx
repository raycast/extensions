import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  Keyboard,
  List,
  confirmAlert,
  environment,
  getPreferenceValues,
} from "@raycast/api";
import type { LaunchProps } from "@raycast/api";
import { useState } from "react";
import { getSearchUrl, readHistory, rememberSearch, updateHistory } from "./search";

export default function Command({ arguments: args, fallbackText }: LaunchProps<{ arguments: Arguments.Index }>) {
  const mode = environment.entryPointName === "searchSold" ? "sold" : "active";
  const placeholder = mode === "sold" ? "Search sold items on eBay" : "Search eBay";
  const { marketplace } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState(args?.query?.trim() || fallbackText?.trim() || "");
  const [recent, setRecent] = useState(() => readHistory(mode));
  const query = searchText.trim();
  const rows = query ? [query] : recent;

  async function clearHistory() {
    const confirmed = await confirmAlert({
      title: "Clear eBay Search History?",
      message: `This clears recent searches for ${mode} listings.`,
      icon: Icon.Trash,
      primaryAction: { title: "Clear History", style: Alert.ActionStyle.Destructive },
    });

    if (confirmed) setRecent(updateHistory(mode, () => []));
  }

  return (
    <List
      filtering={false}
      searchBarPlaceholder={placeholder}
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      <List.EmptyView title={placeholder} icon={Icon.MagnifyingGlass} />
      <List.Section title={query ? "Search" : "Recent Searches"}>
        {rows.map((text) => (
          <List.Item
            key={text}
            title={text}
            icon={query ? Icon.MagnifyingGlass : Icon.Clock}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  url={getSearchUrl(text, marketplace, mode)}
                  onOpen={() => setRecent(rememberSearch(mode, text))}
                />
                {!query && (
                  <>
                    <Action
                      title="Remove from History"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() =>
                        setRecent(updateHistory(mode, (entries) => entries.filter((entry) => entry !== text)))
                      }
                    />
                    <Action
                      title="Clear Search History"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.RemoveAll}
                      onAction={clearHistory}
                    />
                  </>
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
