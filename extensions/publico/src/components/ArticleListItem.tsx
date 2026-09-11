import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { memo } from "react";
import { Article } from "../api/type";
import { getArticleId } from "../api/client";
import {
  cleanDescription,
  extractTags,
  formatAuthors,
  getArticleIcon,
  getArticleUrl,
  getTagColor,
  stripHtml,
  DEFAULT_METADATA_PLACEHOLDER,
  resolvePublishedDate,
} from "../utils/article";
import { MAX_TAGS, SUMMARY_PLACEHOLDER, UNTITLED_ARTICLE } from "../constants";

interface ArticleListItemProps {
  article: Article;
  enrichedArticle?: Article;
  isLoadingDetail?: boolean;
  onRefresh: () => void;
}

function ArticleListItemComponent({
  article,
  enrichedArticle,
  isLoadingDetail,
  onRefresh,
}: ArticleListItemProps) {
  const cleanTitle =
    (article.titulo ? stripHtml(article.titulo) : "") || UNTITLED_ARTICLE;
  const articleUrl = getArticleUrl(article);
  const articleId = getArticleId(article);
  const itemId = String(article.id);

  const authorText = formatAuthors(enrichedArticle?.autores ?? article.autores);
  const extractedTags = extractTags(
    enrichedArticle?.tags ?? article.tags,
  ).slice(0, MAX_TAGS);

  const summarySource = enrichedArticle?.descricao ?? article.descricao;
  const summary = stripHtml(cleanDescription(summarySource));
  const publishedDate = resolvePublishedDate(enrichedArticle ?? article);

  const icon = getArticleIcon(article);
  const detailMarkdown = `# ${cleanTitle}\n\n---\n\n${summary || SUMMARY_PLACEHOLDER}\n`;

  return (
    <List.Item
      id={itemId}
      icon={icon}
      title={cleanTitle}
      detail={
        <List.Item.Detail
          isLoading={isLoadingDetail}
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
              {extractedTags.length > 0 ? (
                <List.Item.Detail.Metadata.TagList title="Keywords">
                  {extractedTags.map((tag, tagIndex) => (
                    <List.Item.Detail.Metadata.TagList.Item
                      key={`${articleId ?? itemId}-tag-${tagIndex}`}
                      text={tag}
                      color={getTagColor(tagIndex)}
                    />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              ) : (
                <List.Item.Detail.Metadata.Label
                  title="Keywords"
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
          <Action.OpenInBrowser title="Open in Browser" url={articleUrl} />
          <Action.CopyToClipboard
            title="Copy URL"
            content={articleUrl}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Title"
            content={cleanTitle}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            onAction={onRefresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}

export const ArticleListItem = memo(ArticleListItemComponent);
