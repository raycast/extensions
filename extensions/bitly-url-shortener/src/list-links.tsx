import { Action, ActionPanel, getPreferenceValues, List } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import { Bitlink, ErrorResult } from "./types";
import { API_HEADERS, API_URL } from "./config";
import { useState } from "react";

const { group_guid } = getPreferenceValues<Preferences.ListLinks>();
export default function ListLinks() {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data: bitlinks } = useFetch(`${API_URL}/groups/${group_guid}/bitlinks?query=${searchText}`, {
    headers: API_HEADERS,
    async parseResponse(response) {
      const result = await response.json();
      if (!response.ok) {
        const { message, errors } = result as ErrorResult;
        throw new Error(`Bitly API Error - ${errors ? JSON.stringify(errors) : message}`);
      }
      return result as {
        links: Bitlink[];
      };
    },
    mapResult(result) {
      return {
        data: result.links,
      };
    },
    initialData: [],
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search links" onSearchTextChange={setSearchText} throttle>
      {!isLoading && !bitlinks.length ? (
        !searchText ? (
          <List.EmptyView
            icon="links-list-empty.png"
            title="More clicks are just a link away"
            description="Shorten long links and get attention by customizing what they say. No more bit.ly/3yqawYa, more bit.ly/brands-bitly."
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Create a Bitly Link"
                  url={`https://app.bitly.com/${group_guid}/links/create`}
                />
              </ActionPanel>
            }
          />
        ) : (
          <List.EmptyView
            icon="links-filter-empty-state"
            title="No results found"
            description="Try adjusting your search, filters, or try searching hidden links instead."
          />
        )
      ) : (
        bitlinks.map((bitlink) => (
          <List.Item
            key={bitlink.id}
            icon={getFavicon(bitlink.long_url)}
            title={bitlink.title}
            subtitle={bitlink.link}
            accessories={[
              {
                date: new Date(bitlink.created_at),
                tooltip: new Date(bitlink.created_at).toDateString(),
              },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Bitlink" content={bitlink.link} />
                <Action.OpenInBrowser
                  title="Open in Bitly"
                  url={`https://app.bitly.com/${group_guid}/links/${bitlink.link}/details`}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
