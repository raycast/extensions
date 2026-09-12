import { useState } from "react";

import { Action, ActionPanel, Detail, Icon, List, useNavigation } from "@raycast/api";

import type { Result } from "./lib/query";
import { useDigByQuery } from "./lib/query";

export default function DigSearchResultsList() {
  const [query, setQuery] = useState<string | null>(null);
  const { push } = useNavigation();
  const { isLoading, data, revalidate } = useDigByQuery(query);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Type a valid Hostname (ex. raycast.com or raycast.com mx)"
      onSearchTextChange={(text) => setQuery(text)}
      throttle
    >
      <ListWithEmptyView validDomain={data.validDomain} query={query} />

      {data.result.map((result, idx) => (
        <List.Item
          id={idx.toString()}
          key={idx}
          title={result.title}
          icon="icon.png"
          accessories={[{ text: result.summary }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Destination" content={result.summary} />
              <Action.OpenInBrowser url={result.url} />
              <Action
                title="Show NS-Record Details"
                icon={Icon.Sidebar}
                onAction={() => push(<Details {...result} />)}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              <Action
                title="Refresh"
                icon={Icon.Repeat}
                onAction={() => revalidate()}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function Details(props: Result) {
  const { title, summary, url } = props;

  return (
    <Detail
      markdown={`# ${title}\n## Destination:\n\`\`\`\n${summary}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={url} />
          <Action.CopyToClipboard title="Copy Destination" content={summary} />
        </ActionPanel>
      }
    />
  );
}

export const ListWithEmptyView = (props: { validDomain: boolean | string; query: string | null }) => {
  const { validDomain, query } = props;

  return (
    <List.EmptyView
      title={query && !!validDomain ? "No records found" : "Type hostname to search"}
      icon={Icon.QuestionMark}
    />
  );
};
