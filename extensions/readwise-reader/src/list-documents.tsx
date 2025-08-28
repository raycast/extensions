import { Action, ActionPanel, getPreferenceValues, Icon, List, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { type PaginationOptions } from "@raycast/utils/dist/types";
import { useState } from "react";
import { list } from "./api/list";
import { type Category } from "./utils/category";
import { type Document } from "./utils/document";
import { titlecase } from "./utils/titlecase";

function getProgressIcon(readingProgress: number) {
  const asPercentage = readingProgress * 100;
  if (asPercentage === 0) {
    return Icon.Circle;
  } else if (asPercentage === 100) {
    return Icon.CircleProgress100;
  } else if (asPercentage > 0 && asPercentage <= 50) {
    return Icon.CircleProgress25;
  } else if (asPercentage > 50 && asPercentage < 75) {
    return Icon.CircleProgress50;
  } else {
    return Icon.CircleProgress75;
  }
}

type Preference = {
  defaultListLocation: Document["location"];
  token: string;
  openInDesktopApp: boolean;
};

export default function ListDocumentsCommand() {
  const [documentLocation, setDocumentLocation] = useState<Document["location"]>(
    getPreferenceValues<Preference>().defaultListLocation,
  );
  const [category, setCategory] = useState<Category | undefined>();

  const { isLoading, data, pagination } = usePromise(
    (location, selectedCategory) => async (options: PaginationOptions<Document[]>) => {
      const { results, nextPageCursor } = await list(location, selectedCategory, options.cursor);
      const sortedDocuments = results.sort(
        (a, b) => new Date(b.last_moved_at).getTime() - new Date(a.last_moved_at).getTime(),
      );

      return {
        data: sortedDocuments,
        hasMore: !!nextPageCursor,
        cursor: nextPageCursor,
      };
    },
    [documentLocation, category],
  );

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Location of the article to fetch"
          defaultValue={documentLocation}
          onChange={(value) => setDocumentLocation(value as Document["location"])}
        >
          <List.Dropdown.Item title="New" value="new" />
          <List.Dropdown.Item title="Shortlist" value="shortlist" />
          <List.Dropdown.Item title="Feed" value="feed" />
          <List.Dropdown.Item title="Later" value="later" />
          <List.Dropdown.Item title="Archive" value="archive" />
        </List.Dropdown>
      }
      pagination={pagination}
      navigationTitle={`Documents in ${titlecase(documentLocation)}${category ? ` (${titlecase(category)})` : ""}`}
    >
      {data?.length === 0 && category !== undefined ? (
        <List.EmptyView
          title="No documents found"
          description={`No documents found in the "${titlecase(category)}" category.`}
          actions={
            <ActionPanel>
              <Action
                title="Reset Category Filter"
                onAction={() => setCategory(undefined)}
                icon={Icon.ArrowClockwise}
              />
            </ActionPanel>
          }
        />
      ) : (
        data?.map((article) => {
          const markdown = `
# ${article.title}

${article.summary}
            `;
          return (
            <List.Item
              key={article.id}
              title={article.title}
              detail={
                <List.Item.Detail
                  markdown={markdown}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Author" text={article.author} />
                      <List.Item.Detail.Metadata.Label title="Website" text={article.site_name} />
                      <List.Item.Detail.Metadata.Label title="Category" text={article.category} />
                      <List.Item.Detail.Metadata.TagList title="Tags">
                        {Object.values(article.tags).map(({ name }) => (
                          <List.Item.Detail.Metadata.TagList.Item text={name} key={name} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              icon={getProgressIcon(article.reading_progress)}
              actions={
                <ActionPanel title={article.title}>
                  <Action title="Open Article in Readwise" onAction={() => open(article.url)} icon={Icon.Globe} />
                  <Action.OpenInBrowser url={article.source_url} title="Open Article in Source Website" />
                  <ActionPanel.Submenu title="Filter by Category…" shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}>
                    <Action
                      title="All Categories"
                      onAction={() => setCategory(undefined)}
                      icon={Icon.Tag}
                      shortcut={{ modifiers: ["cmd"], key: "1" }}
                    />
                    <Action
                      title="Article"
                      onAction={() => setCategory("article")}
                      icon={Icon.Document}
                      shortcut={{ modifiers: ["cmd"], key: "2" }}
                    />
                    <Action
                      title="Email"
                      onAction={() => setCategory("email")}
                      icon={Icon.Envelope}
                      shortcut={{ modifiers: ["cmd"], key: "3" }}
                    />
                    <Action
                      title="Rss"
                      onAction={() => setCategory("rss")}
                      icon={Icon.Wifi}
                      shortcut={{ modifiers: ["cmd"], key: "4" }}
                    />
                    <Action
                      title="Highlight"
                      onAction={() => setCategory("highlight")}
                      icon={Icon.Highlight}
                      shortcut={{ modifiers: ["cmd"], key: "5" }}
                    />
                    <Action
                      title="Note"
                      onAction={() => setCategory("note")}
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ["cmd"], key: "6" }}
                    />
                    <Action
                      title="Pdf"
                      onAction={() => setCategory("pdf")}
                      icon={{
                        source: {
                          light: "pdf-light.svg",
                          dark: "pdf-dark.svg",
                        },
                      }}
                      shortcut={{ modifiers: ["cmd"], key: "7" }}
                    />
                    <Action
                      title="Epub"
                      onAction={() => setCategory("epub")}
                      icon={Icon.Book}
                      shortcut={{ modifiers: ["cmd"], key: "8" }}
                    />
                    <Action
                      title="Tweet"
                      onAction={() => setCategory("tweet")}
                      icon={Icon.Bird}
                      shortcut={{ modifiers: ["cmd"], key: "9" }}
                    />
                    <Action
                      title="Video"
                      onAction={() => setCategory("video")}
                      icon={Icon.Video}
                      shortcut={{ modifiers: ["cmd"], key: "0" }}
                    />
                  </ActionPanel.Submenu>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
