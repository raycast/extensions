import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { fetchTopNews } from "./api/client";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import {
  cleanDescription,
  extractTags,
  formatAuthors,
  getArticleIcon,
  getArticleUrl,
  getTagColor,
  DEFAULT_METADATA_PLACEHOLDER,
  resolvePublishedDate,
} from "./utils/article";

const MAX_TAGS = 6;
const SUMMARY_PLACEHOLDER = "No summary available.";
const UNTITLED_ARTICLE = "Untitled";

export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    fetchTopNews,
    [],
    {
      keepPreviousData: true,
      onError: (err) => {
        const message = err instanceof Error ? err.message : String(err);
        void showFailureToast({ title: "Unable to load top news", message });
      },
    },
  );

  const articles = data ?? [];
  const errorMessage = error
    ? error instanceof Error
      ? error.message
      : String(error)
    : null;

  if (errorMessage) {
    return (
      <List
        isLoading={isLoading}
        isShowingDetail
        searchBarPlaceholder="Search trending headlines..."
      >
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Unable to load Público news"
          description={errorMessage}
        />
      </List>
    );
  }

  if (!isLoading && articles.length === 0) {
    return (
      <List
        isLoading={isLoading}
        isShowingDetail
        searchBarPlaceholder="Search trending headlines..."
      >
        <List.EmptyView
          icon={Icon.Document}
          title="No trending articles"
          description="Check back soon for the most popular stories from Público."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search trending headlines..."
    >
      {articles.map((article, index) => {
        const cleanTitle =
          article.titulo?.replace(/<[^>]*>/g, "") || UNTITLED_ARTICLE;
        const authorText = formatAuthors(article.autores);
        const tags = extractTags(article.tags).slice(0, MAX_TAGS);
        const publishedDate = resolvePublishedDate(article);
        const icon = getArticleIcon(article);
        const articleUrl = getArticleUrl(article);
        const summary = cleanDescription(article.descricao);
        const detailMarkdown = `# ${cleanTitle}\n\n---\n\n${summary || SUMMARY_PLACEHOLDER}\n`;

        return (
          <List.Item
            key={`article-${index}`}
            icon={icon}
            title={cleanTitle}
            detail={
              <List.Item.Detail
                markdown={detailMarkdown}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Author"
                      text={authorText}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Published"
                      text={publishedDate}
                    />
                    {tags.length > 0 ? (
                      <List.Item.Detail.Metadata.TagList title="Keywords">
                        {tags.map((tag, tagIndex) => (
                          <List.Item.Detail.Metadata.TagList.Item
                            key={`tag-${tagIndex}`}
                            text={tag}
                            color={getTagColor(tagIndex)}
                          />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    ) : (
                      <List.Item.Detail.Metadata.Label
                        title="Topics"
                        text={DEFAULT_METADATA_PLACEHOLDER}
                        icon={Icon.Tag}
                      />
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open in Browser"
                  url={articleUrl}
                />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={articleUrl}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  title="Refresh"
                  icon={Icon.RotateClockwise}
                  onAction={() => {
                    void revalidate();
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
