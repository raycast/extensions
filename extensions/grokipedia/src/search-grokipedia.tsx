import { ActionPanel, Action, List, Detail, Icon, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { GrokipediaClient } from "./grokipedia/client";
import { SearchResult } from "./grokipedia/types";

const client = new GrokipediaClient();

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const {
    data: searchResults,
    isLoading,
    error,
  } = usePromise(
    async (query) => {
      const results = await client.search(query || "popular");
      return results;
    },
    [searchText],
  );

  if (error) {
    console.error("Search error:", error);
  }

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search Grokipedia..." throttle>
      <List.Section title="Results" subtitle={searchResults?.results.length + ""}>
        {searchResults?.results.map((searchResult) => (
          <SearchListItem key={searchResult.slug} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  const cleanTitle = searchResult.title.replace(/<[^>]*>?/gm, "");

  return (
    <List.Item
      title={cleanTitle}
      accessories={[{ text: `${searchResult.viewCount.toLocaleString()}`, icon: Icon.Eye, tooltip: "View Count" }]}
      actions={
        <ActionPanel>
          <Action.Push title="View Article" target={<ArticleDetail slug={searchResult.slug} />} icon={Icon.Eye} />
          <Action.OpenInBrowser url={`https://grokipedia.com/page/${searchResult.slug}`} />
          <Action.CopyToClipboard title="Copy Page Link" content={`https://grokipedia.com/page/${searchResult.slug}`} />
        </ActionPanel>
      }
    />
  );
}

function ArticleDetail({ slug }: { slug: string }) {
  const { data: pageData, isLoading } = usePromise((slug: string) => client.getPage(slug), [slug]);

  const page = pageData?.page;
  let markdown = "";

  if (!isLoading && !page) {
    markdown = "Article not found.";
  } else if (page) {
    let processedContent = page.content.replace(/!\[(.*?)\]\(\/(.*?)\)/g, `![$1](https://grokipedia.com/$2)`);

    const visibleCitations = page.citations.filter((c) => c.title && c.title.trim() !== "");

    visibleCitations.forEach((citation, index) => {
      const citationNumber = index + 1;
      // Escape special characters in URL for regex
      const escapedUrl = citation.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\[\\]\\((${escapedUrl})\\)`, "g");
      // Add a non-breaking space and include brackets in the link text
      processedContent = processedContent.replace(regex, `[[${citationNumber}]]($1)`);
    });

    markdown = `${processedContent}`;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={page?.title || "Grokipedia"}
      actions={
        page ? (
          <ActionPanel>
            <Action.OpenInBrowser url={`https://grokipedia.com/page/${page.slug}`} />
            <Action.CopyToClipboard title="Copy Page Link" content={`https://grokipedia.com/page/${page.slug}`} />
            <Action.CopyToClipboard title="Copy Title" content={page.title} />
            <Action.CopyToClipboard title="Copy Content" content={markdown} />
            {page.citations && page.citations.length > 0 && (
              <Action.CopyToClipboard
                title="Copy All Citations"
                content={page.citations.map((c) => c.url).join("\n")}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            )}
          </ActionPanel>
        ) : null
      }
      metadata={
        page ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Slug" text={page.slug} />
            {page.stats.viewCount && (
              <Detail.Metadata.Label title="Views" text={page.stats.viewCount.toLocaleString()} />
            )}
            <Detail.Metadata.Separator />
            {page.citations && page.citations.filter((c) => c.title && c.title.trim() !== "").length > 0 && (
              <Detail.Metadata.TagList title="Citations">
                {page.citations
                  .filter((c) => c.title && c.title.trim() !== "")
                  .map((citation, index) => (
                    <Detail.Metadata.TagList.Item
                      key={citation.id}
                      text={`${index + 1}. ${citation.title}`}
                      color={"#a8a29e"}
                      onAction={() => open(citation.url)}
                    />
                  ))}
              </Detail.Metadata.TagList>
            )}
          </Detail.Metadata>
        ) : null
      }
    />
  );
}
