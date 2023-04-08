import { useState } from "react";
import { XMLParser } from "fast-xml-parser";
import { useFetch, Response } from "@raycast/utils";
import { ActionPanel, Action, List, Icon } from "@raycast/api";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  if (searchText.length === 0) {
    // Don't fire search if query is empty
    // https://github.com/rhubarbgroup/raycast-wordpress-docs/issues/1
  }

  const query = searchText.length === 0 ? "get_" : searchText;

  const { data, isLoading } = useFetch(`https://developer.wordpress.org/search/${query}/feed/rss/`, {
    parseResponse: parseFetchResponse,
  });

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search WordPress code reference..."
      throttle
    >
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((searchResult: SearchResult) => (
          <SearchListItem key={searchResult.name} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.name}
      subtitle={searchResult.description}
      accessories={[{ icon: Icon.Code, text: searchResult.type }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={searchResult.url} />
            <Action.CopyToClipboard title="Copy URL to Clipboard" content={searchResult.url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function parseFetchResponse(response: Response) {
  const data = await response.text();

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const xml = new XMLParser();
  const result = xml.parse(data);

  if (response.redirected) {
    const parts = response.url
      .split("/")
      .filter((part) => part)
      .reverse();

    return [
      {
        name: parts[0],
        description: "",
        type: parts[1].slice(0, -1),
        url: response.url,
      } as SearchResult,
    ];
  }

  if (!result.rss || !result.rss.channel || !result.rss.channel.item) {
    return null;
  }

  return result.rss.channel.item.map((match: RssItem) => {
    console.log(match);
    const text = match.description.replace(/(<([^>]+)>)/gi, "");
    const type = text.substring(0, text.indexOf(":")).trim();
    const description = text.substring(text.indexOf(":") + 1).trim();

    return {
      name: match.title,
      description: description,
      type: type,
      url: match.link,
    } as SearchResult;
  });
}

interface SearchResult {
  name: string;
  description: string;
  type: string;
  url: string;
}

interface RssItem {
  title: string;
  description: string;
  link: string;
  url: string;
}
