import { Action, ActionPanel, Icon, launchCommand, LaunchType, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { LinkdingAccount, LinkdingAccountForm, LinkdingAccountMap, LinkdingBookmark } from "./types/linkding-types";

import { getPersistedLinkdingAccounts } from "./service/user-account-service";
import { deleteBookmark, searchBookmarks } from "./service/bookmark-service";
import { showSuccessToast } from "./util/bookmark-util";
import { LinkdingShortcut } from "./types/linkding-shortcuts";
import { getFavicon, usePromise } from "@raycast/utils";

export default function searchLinkding() {
  const [selectedLinkdingAccount, setSelectedLinkdingAccount] = useState<LinkdingAccountForm | LinkdingAccount | null>(
    null
  );
  const [linkdingAccountMap, setLinkdingAccountMap] = useState<LinkdingAccountMap>({});
  const [hasLinkdingAccounts, setHasLindingAccounts] = useState(false);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    getPersistedLinkdingAccounts().then((linkdingMap) => {
      if (linkdingMap) {
        setLinkdingAccountMap(linkdingMap);
        setHasLindingAccounts(Object.keys(linkdingMap).length > 0);
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

  if (hasLinkdingAccounts) {
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
            />
          ))}
        </List.Section>
      </List>
    );
  } else {
    return (
      <List>
        <List.EmptyView
          title="You don't have a Linkding Account"
          description="Please create a linkding account before searching for bookmarks."
          actions={
            <ActionPanel>
              <Action
                icon={Icon.ArrowRight}
                title="Go to Manage Account"
                onAction={() => launchCommand({ name: "manage-account", type: LaunchType.UserInitiated })}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }
}

function SearchListItem({
  linkdingBookmark,
  deleteBookmarkCallback,
}: {
  linkdingBookmark: LinkdingBookmark;
  deleteBookmarkCallback: (bookmarkId: number) => void;
}) {
  function showCopyToast() {
    showSuccessToast("Copied to Clipboard");
  }

  return (
    <List.Item
      icon={getFavicon(linkdingBookmark.url, { fallback: Icon.Globe })}
      title={
        linkdingBookmark.title.length > 0
          ? linkdingBookmark.title
          : linkdingBookmark.website_title ?? linkdingBookmark.url
      }
      subtitle={
        linkdingBookmark.description && linkdingBookmark.description.length > 0
          ? linkdingBookmark.description
          : linkdingBookmark.website_description
      }
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
