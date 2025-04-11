import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { LinkdingAccount, LinkdingAccountForm, LinkdingAccountMap, LinkdingBookmark } from "./types/linkding-types";

import { getFavicon, usePromise } from "@raycast/utils";
import NoAccountsList from "./components/no-accounts-list";
import { deleteBookmark, searchBookmarks } from "./service/bookmark-service";
import { getPersistedLinkdingAccounts } from "./service/user-account-service";
import { LinkdingShortcut } from "./types/linkding-shortcuts";
import { showSuccessToast } from "./util/bookmark-util";

export default function searchLinkding() {
  const preferences = getPreferenceValues<Preferences>();
  const [selectedLinkdingAccount, setSelectedLinkdingAccount] = useState<LinkdingAccountForm | LinkdingAccount | null>(
    null
  );
  const [linkdingAccountMap, setLinkdingAccountMap] = useState<LinkdingAccountMap>({});
  const [hasLinkdingAccounts, setHasLinkdingAccounts] = useState(false);
  const [numberOfAccounts, setNumberOfAccounts] = useState(0);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    getPersistedLinkdingAccounts().then((linkdingMap) => {
      if (linkdingMap) {
        setLinkdingAccountMap(linkdingMap);
        const accountNames = Object.keys(linkdingMap);
        setNumberOfAccounts(accountNames.length);
        setHasLinkdingAccounts(accountNames.length > 0);
        if (accountNames.length > 0) {
          setSelectedLinkdingAccount(linkdingMap[accountNames[0]]);
        }
      }
    });
  }, [setLinkdingAccountMap]);

  const {
    isLoading,
    revalidate,
    data: linkdingBookmarks,
    mutate,
  } = usePromise(
    async (account: LinkdingAccount | null, searchText: string) => {
      if (!account) return [];
      const bookmarks = await searchBookmarks(account, searchText);
      return bookmarks.data.results;
    },
    [selectedLinkdingAccount, searchText],
    { execute: !!selectedLinkdingAccount }
  );

  async function deleteBookmarkCallback(bookmarkId: number) {
    if (selectedLinkdingAccount) {
      const toast = await showToast(Toast.Style.Animated, "Deleting bookmark", bookmarkId.toString());
      try {
        await mutate(deleteBookmark(selectedLinkdingAccount, bookmarkId));
        toast.style = Toast.Style.Success;
        toast.title = "Bookmark deleted";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not delete";
        toast.message = `${error}`;
      }
    }
  }

  function LinkdingAccountDropdown() {
    if (numberOfAccounts < 2) return;

    function setSelectedAccount(name: string): void {
      const linkdingAccount = { name, ...linkdingAccountMap[name] };
      setSelectedLinkdingAccount(linkdingAccount);
      revalidate();
    }

    return (
      <List.Dropdown tooltip="User Account" onChange={(name) => setSelectedAccount(name)} throttle storeValue>
        {Object.keys(linkdingAccountMap).map((name) => (
          <List.Dropdown.Item key={name} title={name} value={name} />
        ))}
      </List.Dropdown>
    );
  }

  if (!hasLinkdingAccounts) {
    return <NoAccountsList />;
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search through bookmarks..."
      searchBarAccessory={<LinkdingAccountDropdown />}
      throttle
    >
      <List.Section title="Results" subtitle={linkdingBookmarks?.length + ""}>
        {linkdingBookmarks?.map((linkdingBookmark) => (
          <SearchListItem
            key={linkdingBookmark.id}
            linkdingBookmark={linkdingBookmark}
            deleteBookmarkCallback={deleteBookmarkCallback}
            preferences={preferences}
          />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({
  linkdingBookmark,
  deleteBookmarkCallback,
  preferences,
}: {
  linkdingBookmark: LinkdingBookmark;
  deleteBookmarkCallback: (bookmarkId: number) => void;
  preferences: Preferences;
}) {
  function showCopyToast() {
    showSuccessToast("Copied to Clipboard");
  }

  const subtitle = useMemo(() => {
    if (!preferences.showDescription) {
      return "";
    }
    if (linkdingBookmark.description && linkdingBookmark.description.length > 0) {
      return linkdingBookmark.description;
    }
    return linkdingBookmark.website_description;
  }, [linkdingBookmark, preferences]);

  const tags = useMemo(() => {
    if (!preferences.showTags) {
      return [];
    }
    return linkdingBookmark.tag_names.map((tag) => ({
      tag: "#" + tag,
    }));
  }, [linkdingBookmark, preferences]);

  return (
    <List.Item
      icon={getFavicon(linkdingBookmark.url, { fallback: Icon.Globe })}
      title={
        linkdingBookmark.title.length > 0
          ? linkdingBookmark.title
          : linkdingBookmark.website_title ?? linkdingBookmark.url
      }
      subtitle={subtitle}
      accessories={tags}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={linkdingBookmark.url} />
            <Action.CopyToClipboard
              content={linkdingBookmark.url}
              onCopy={showCopyToast}
              shortcut={LinkdingShortcut.COPY_SHORTCUT}
            />
            <Action
              onAction={() => deleteBookmarkCallback(linkdingBookmark.id)}
              icon={{ source: Icon.Trash }}
              title="Delete"
              shortcut={LinkdingShortcut.DELETE_SHORTCUT}
              style={Action.Style.Destructive}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
