import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Agent } from "https";
import { LinkdingAccountMap, LinkdingBookmark, LinkdingForm, LinkdingResponse } from "./types/linkding-types";

import { getPersistedLinkdingAccounts } from "./service/user-account-service";

export default function searchLinkding() {
  const [selectedLinkdingAccount, setSelectedLinkdingAccount] = useState<LinkdingForm | null>(null);
  const [linkdingAccountMap, setLinkdingAccountMap] = useState<LinkdingAccountMap>({});
  const [isLoading, setLoading] = useState(true);
  const [hasLinkdingAccounts, setHasLindingAccounts] = useState(false);
  const [linkdingBookmarks, setLinkdingBookmarks] = useState<LinkdingBookmark[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    getPersistedLinkdingAccounts().then((linkdingMap) => {
      if (linkdingMap) {
        setLinkdingAccountMap(linkdingMap);
        setHasLindingAccounts(Object.keys(linkdingMap).length > 0);
      }
    });
  }, [setLinkdingAccountMap]);

  function createAbortController(timeoutMs: number) {
    const abortController = new AbortController();
    setTimeout(() => abortController.abort(), timeoutMs || 0);

    return abortController;
  }

  function fetchBookmarks(searchText: string, linkdingAccount: LinkdingForm | null) {
    if (linkdingAccount) {
      abortControllerRef.current?.abort();
      abortControllerRef.current = createAbortController(5000);
      setLoading(true);
      axios<LinkdingResponse>(`${linkdingAccount.serverUrl}/api/bookmarks?` + new URLSearchParams({ q: searchText }), {
        signal: abortControllerRef.current?.signal,
        responseType: "json",
        httpsAgent: new Agent({ rejectUnauthorized: !linkdingAccount.ignoreSSL }),
        headers: { Authorization: `Token ${linkdingAccount.apiKey}` },
      })
        .then((data) => {
          setLinkdingBookmarks(data.data.results);
        })
        .catch((err) => {
          if (!axios.isCancel(err)) {
            showToast({
              style: Toast.Style.Failure,
              title: "Something went wrong",
              message: err.message,
            });
          }
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }

  function LinkdingAccountDropdown() {
    function setSelectedAccount(name: string): void {
      const linkdingAccount = { name, ...linkdingAccountMap[name] };
      setSelectedLinkdingAccount(linkdingAccount);
      fetchBookmarks("", linkdingAccount);
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
        onSearchTextChange={(searchText) => fetchBookmarks(searchText, selectedLinkdingAccount)}
        searchBarPlaceholder="Search through bookmarks..."
        searchBarAccessory={<LinkdingAccountDropdown />}
        throttle
      >
        <List.Section title="Results" subtitle={linkdingBookmarks?.length + ""}>
          {linkdingBookmarks?.map((linkdingBookmark) => (
            <SearchListItem key={linkdingBookmark.id} linkdingBookmark={linkdingBookmark} />
          ))}
        </List.Section>
      </List>
    );
  } else {
    return (
      <List>
        <List.EmptyView
          title="You dont have a Linkding Account"
          description="Please create a linking account before searching for bookmarks."
        />
      </List>
    );
  }
}

function SearchListItem({ linkdingBookmark }: { linkdingBookmark: LinkdingBookmark }) {
  return (
    <List.Item
      title={
        linkdingBookmark.title.length > 0
          ? linkdingBookmark.title
          : linkdingBookmark.website_title ?? linkdingBookmark.url
      }
      subtitle={
        linkdingBookmark.description.length > 0 ? linkdingBookmark.description : linkdingBookmark.website_description
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={linkdingBookmark.url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
