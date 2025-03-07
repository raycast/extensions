import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useState } from "react";
import { APIOperation } from "./types/api";
import { searchAPIs } from "./utils/api-search";

interface GroupedAPIResults {
  exactMatches: APIOperation[];
  otherMatches: APIOperation[];
}

export default function APICommand() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [groupedApis, setGroupedApis] = useState<GroupedAPIResults>({
    exactMatches: [],
    otherMatches: [],
  });

  const search = async (text: string) => {
    if (!text.trim()) {
      setGroupedApis({ exactMatches: [], otherMatches: [] });
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchAPIs(text);

      // Group results
      const grouped = results.reduce<GroupedAPIResults>(
        (acc, api) => {
          const searchLower = text.toLowerCase();
          const apiNameLower = api.name.toLowerCase();

          // Check for direct API name matches
          if (apiNameLower.includes(searchLower)) {
            acc.exactMatches.push(api);
          } else {
            acc.otherMatches.push(api);
          }
          return acc;
        },
        { exactMatches: [], otherMatches: [] },
      );

      setGroupedApis(grouped);
    } catch (error) {
      console.error("API search failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const { exactMatches, otherMatches } = groupedApis;
  const totalCount = exactMatches.length + otherMatches.length;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={(text) => {
        setSearchText(text);
        search(text);
      }}
      searchBarPlaceholder="Search Aliyun APIs..."
      throttle
    >
      {exactMatches.length > 0 && (
        <List.Section title="Direct Matches" subtitle={`${exactMatches.length} items`}>
          {exactMatches.map((api) => (
            <APIListItem key={`${api.product}-${api.name}-${api.version}`} api={api} />
          ))}
        </List.Section>
      )}

      {otherMatches.length > 0 && (
        <List.Section title="Related APIs" subtitle={`${otherMatches.length} items`}>
          {otherMatches.map((api) => (
            <APIListItem key={`${api.product}-${api.name}-${api.version}`} api={api} />
          ))}
        </List.Section>
      )}

      {totalCount === 0 && searchText.trim() && !isLoading && (
        <List.EmptyView
          title="No APIs Found"
          description="Try searching with different keywords"
          icon={Icon.QuestionMark}
        />
      )}
    </List>
  );
}

function APIListItem({ api }: { api: APIOperation }) {
  const apiUrl = `https://api.aliyun.com/api/${api.product}/${api.version}/${api.apiPath}`;

  return (
    <List.Item
      title={api.name}
      subtitle={api.productName}
      accessories={[{ text: api.version }, { text: api.description }]}
      icon={Icon.Terminal}
      detail={
        <List.Item.Detail
          markdown={`
# ${api.name}
**Product:** ${api.productName} (${api.product})
**Version:** ${api.version}
**Description:** ${api.description}

---
${api.summary}
          `}
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open Api Document" url={apiUrl} icon={Icon.Document} />
            <Action.CopyToClipboard content={apiUrl} title="Copy URL to Clipboard" icon={Icon.Clipboard} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
