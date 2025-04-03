import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { SearchListItem } from "./components/searchListltem";
import { useSearch } from "./hooks/useSearch";
import { storageService } from "./services/storageService";
import { SearchResult } from "./types";
import { isWeChatInstalled } from "./utils/isWeChatInstalled";
import { isWeChatInstalledAlertDialog } from "./utils/isWeChatInstalledAlert";
import { isWeChatTweakInstalled } from "./utils/isWeChatTweakInstalled";
import { isWeChatTweakInstalledAlertDialog } from "./utils/isWeChatTweakInstalledAlert";

export default function Command() {
  async function isWeChatInstalledCheck() {
    if (!isWeChatInstalled()) {
      await isWeChatInstalledAlertDialog();
      return;
    }
  }
  isWeChatInstalledCheck();

  async function isWeChatTweakInstalledCheck() {
    if (!isWeChatTweakInstalled()) {
      await isWeChatTweakInstalledAlertDialog();
      return;
    }
  }
  isWeChatTweakInstalledCheck();

  const { state, search, clearRecentContacts } = useSearch();
  const [pinnedContacts, setPinnedContacts] = useState<SearchResult[]>([]);

  useEffect(() => {
    const loadPinnedContacts = async () => {
      const contacts = await storageService.getPinnedContacts();
      setPinnedContacts(contacts);
    };
    loadPinnedContacts();
  }, []);

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search WeChat contacts (supports Chinese, Pinyin, mixed search)..."
      throttle
    >
      {pinnedContacts.length > 0 && (
        <List.Section title="Pinned Contacts:" subtitle={pinnedContacts.length + ""}>
          {pinnedContacts.map((contact) => (
            <SearchListItem
              key={`pinned-${contact.arg}`}
              searchResult={contact}
              isPinned={true}
              onTogglePin={async () => {
                const newPinnedContacts = pinnedContacts.filter((c) => c.arg !== contact.arg);
                setPinnedContacts(newPinnedContacts);
                await storageService.setPinnedContacts(newPinnedContacts);
              }}
              onClearHistory={clearRecentContacts}
            />
          ))}
        </List.Section>
      )}

      {state.recentContacts.length > 0 && state.searchText === "" && (
        <List.Section title="Recent Contacts:" subtitle={state.recentContacts.length + ""}>
          {state.recentContacts.map((contact) => {
            const isAlreadyPinned = pinnedContacts.some((pinned) => pinned.arg === contact.arg);
            if (isAlreadyPinned) {
              return null;
            }

            return (
              <SearchListItem
                key={`recent-${contact.arg}`}
                searchResult={contact}
                isPinned={false}
                onTogglePin={async () => {
                  const newPinnedContacts = [...pinnedContacts, contact];
                  setPinnedContacts(newPinnedContacts);
                  await storageService.setPinnedContacts(newPinnedContacts);
                }}
                onClearHistory={clearRecentContacts}
              />
            );
          })}
        </List.Section>
      )}

      <List.Section title="Contacts:" subtitle={state.items.length + ""}>
        {state.items.map((searchResult) => {
          const isAlreadyPinned = pinnedContacts.some((contact) => contact.arg === searchResult.arg);
          if (isAlreadyPinned) {
            return null;
          }

          return (
            <SearchListItem
              key={searchResult.arg}
              searchResult={searchResult}
              isPinned={false}
              onTogglePin={async () => {
                const newPinnedContacts = [...pinnedContacts, searchResult];
                setPinnedContacts(newPinnedContacts);
                await storageService.setPinnedContacts(newPinnedContacts);
              }}
              onClearHistory={clearRecentContacts}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
