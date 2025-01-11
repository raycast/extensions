import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const params = new URLSearchParams();
  params.append("locale", "zh-CN"); // 添加 locale 参数，请求中文文档
  params.append("q", searchText.length === 0 ? "javascript" : searchText);

  const { data, isLoading } = useFetch("https://developer.mozilla.org/api/v1/search?" + params.toString(), {
    parseResponse,
    initialData: [],
    keepPreviousData: true,
  });

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search MDN documentation..."
      throttle
    >
      <List.Section title="Results" subtitle={data.length + ""}>
        {data.map((searchResult) => (
          <SearchListItem key={searchResult.title} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.title}
      subtitle={searchResult.summary}
      accessories={[{ icon: Icon.Document, text: searchResult.type }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={searchResult.url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy URL"
              content={searchResult.url}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function parseResponse(response: Response): Promise<SearchResult[]> {
  const json = (await response.json()) as
    | {
        documents: {
          title: string;
          summary: string;
          mdn_url: string;
          type: string;
        }[];
      }
    | { code: string; message: string };

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  return json.documents.map((document) => {
    return {
      title: document.title,
      summary: document.summary,
      url: `https://developer.mozilla.org${document.mdn_url}`,
      type: document.type,
    };
  });
}

interface SearchResult {
  title: string;
  summary: string;
  url: string;
  type: string;
}
