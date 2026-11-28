import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  Keyboard,
  List,
  PopToRootType,
  closeMainWindow,
  confirmAlert,
  environment,
  getPreferenceValues,
  open,
} from "@raycast/api";
import type { LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { getSearchUrl, readHistory, rememberSearch, updateHistory } from "./search";

export default function Command({ arguments: args, fallbackText }: LaunchProps<{ arguments: Arguments.Index }>) {
  const mode = environment.entryPointName === "search-sold" ? "sold" : "active";
  const placeholder = mode === "sold" ? "Search sold items on eBay" : "Search eBay";
  const { marketplace } = getPreferenceValues<Preferences>();
  const launchQuery = args?.query?.trim() || fallbackText?.trim() || "";
  const [searchText, setSearchText] = useState(launchQuery);
  const [isOpening, setIsOpening] = useState(Boolean(launchQuery));
  const didStartLaunchSearch = useRef(false);
  const [recent, setRecent] = useState(() => readHistory(mode));
  const query = searchText.trim();
  const rows = query ? [query] : recent;

  useEffect(() => {
    if (!launchQuery || didStartLaunchSearch.current) return;
    didStartLaunchSearch.current = true;

    async function openLaunchQuery() {
      try {
        await open(getSearchUrl(launchQuery, marketplace, mode));
        setRecent(rememberSearch(mode, launchQuery));
        await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
      } catch (error) {
        setIsOpening(false);
        await showFailureToast(error, { title: "Could Not Search eBay" });
      }
    }

    void openLaunchQuery();
  }, [launchQuery, marketplace, mode]);

  async function removeFromHistory(text: string) {
    const confirmed = await confirmAlert({
      title: "Remove Recent Search?",
      message: text,
      icon: Icon.Trash,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });

    if (confirmed) setRecent(updateHistory(mode, (entries) => entries.filter((entry) => entry !== text)));
  }

  async function clearHistory() {
    const confirmed = await confirmAlert({
      title: "Clear eBay Search History?",
      message: `This clears recent searches for ${mode} listings.`,
      icon: Icon.Trash,
      primaryAction: { title: "Clear History", style: Alert.ActionStyle.Destructive },
    });

    if (confirmed) setRecent(updateHistory(mode, () => []));
  }

  if (isOpening) return <List isLoading searchBarPlaceholder={placeholder} />;

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
                  <ActionPanel.Submenu title="Manage History" icon={Icon.Clock}>
                    <Action
                      title="Remove from History"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() => removeFromHistory(text)}
                    />
                    <Action
                      title="Clear Search History"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.RemoveAll}
                      onAction={clearHistory}
                    />
                  </ActionPanel.Submenu>
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
