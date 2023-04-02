import { Action, ActionPanel, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import axios from "axios";
import { Agent } from "https";
import { LinkdingBookmark, LinkdingResponse, LinkdingServer } from "./types/linkding-types";

export default function searchLinkding() {
  const preferences = getPreferenceValues<LinkdingServer>();
  const linkdingAccount: LinkdingServer = {
    serverUrl: preferences.serverUrl.endsWith("/") ? preferences.serverUrl.slice(0, -1) : preferences.serverUrl,
    apiKey: preferences.apiKey,
    ignoreSSL: preferences.ignoreSSL,
  };

  const [searchText, setSearchText] = useState("");
  const [isLoading, setLoading] = useState(false);
  const [data, setData] = useState<LinkdingBookmark[]>([]);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    setLoading(true);
    axios<LinkdingResponse>(`${linkdingAccount.serverUrl}/api/bookmarks?` + new URLSearchParams({ q: searchText }), {
      responseType: "json",
      httpsAgent: new Agent({
        rejectUnauthorized: !linkdingAccount.ignoreSSL,
      }),
      headers: {
        Authorization: `Token ${linkdingAccount.apiKey}`,
      },
    })
      .then((data) => {
        setData(data.data.results);
      })
      .catch((err) => {
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [searchText]);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
    }
  }, [error]);

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search bookmarks..." throttle>
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
      title={linkdingBookmark.title.length > 0 ? linkdingBookmark.title : linkdingBookmark.website_title}
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
