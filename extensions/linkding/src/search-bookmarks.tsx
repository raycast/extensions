import { Action, ActionPanel, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import axios, { CancelTokenSource } from "axios";
import { Agent } from "https";
import { LinkdingBookmark, LinkdingResponse, LinkdingServer } from "./types/linkding-types";

export default function searchLinkding() {
  const preferences = getPreferenceValues<LinkdingServer>();
  const linkdingAccount: LinkdingServer = {
    serverUrl: preferences.serverUrl.endsWith("/") ? preferences.serverUrl.slice(0, -1) : preferences.serverUrl,
    apiKey: preferences.apiKey,
    ignoreSSL: preferences.ignoreSSL,
  };

  const [isLoading, setLoading] = useState(true);
  const [data, setData] = useState<LinkdingBookmark[]>([]);
  const cancelRef = useRef<CancelTokenSource | null>(null);

  function fetchBookmarks(searchText: string) {
    cancelRef.current?.cancel();
    cancelRef.current = axios.CancelToken.source();
    setLoading(true);
    axios<LinkdingResponse>(`${linkdingAccount.serverUrl}/api/bookmarks?` + new URLSearchParams({ q: searchText }), {
      cancelToken: cancelRef.current?.token,
      responseType: "json",
      httpsAgent: new Agent({ rejectUnauthorized: !linkdingAccount.ignoreSSL }),
      headers: { Authorization: `Token ${linkdingAccount.apiKey}` },
    })
      .then((data) => {
        setData(data.data.results);
      })
      .catch((err) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Something went wrong",
          message: err.message,
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchBookmarks("");
    return () => {
      cancelRef.current?.cancel();
    };
  }, []);

  return (
    <List isLoading={isLoading} onSearchTextChange={fetchBookmarks} searchBarPlaceholder="Search bookmarks..." throttle>
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((linkdingBookmark) => (
          <SearchListItem key={linkdingBookmark.id} linkdingBookmark={linkdingBookmark} />
        ))}
      </List.Section>
    </List>
  );
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
