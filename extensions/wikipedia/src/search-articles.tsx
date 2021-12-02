import { ActionPanel, CopyToClipboardAction, Icon, List, OpenInBrowserAction, PushAction } from "@raycast/api";
import { useState } from "react";
import { useWikipediaArticle, useWikipediaArticles } from "./wikipedia";
import { ArticleSummary } from "./article-summary";

export default function SearchArticles() {
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState<string>();
  const { data: articles, isValidating } = useWikipediaArticles(search);

  // Pre-fetch selected item for detail view
  useWikipediaArticle(title);

  return (
    <List
      throttle
      onSelectionChange={setTitle}
      isLoading={isValidating}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search articles by name..."
    >
      {articles?.map(title => (
        <List.Item
          icon={Icon.TextDocument}
          id={title}
          key={title}
          title={title}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <PushAction
                  icon={Icon.Sidebar}
                  title="Show Summary"
                  target={<ArticleSummary title={title} />}
                />
                <OpenInBrowserAction url={`https://wikipedia.org/wiki/${title}`} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <CopyToClipboardAction
                  title="Copy URL"
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                  content={`https://wikipedia.org/wiki/${title}`}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
