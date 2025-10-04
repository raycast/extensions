import { ActionPanel, Action, Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchArticleDetail, extractArticleId } from "./api/client";
import { formatDate } from "./utils/formatDate";
import { Article } from "./api/type";
import { formatAuthors } from "./utils/article";

interface ArticleViewProps {
  articleUrl: string;
  articleTitle: string;
}

export default function ArticleView(props: ArticleViewProps) {
  const { articleUrl, articleTitle } = props;
  const [isLoading, setIsLoading] = useState(true);
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchArticleContent() {
      try {
        setIsLoading(true);
        const articleId = extractArticleId(articleUrl);

        if (!articleId) {
          setError("Could not extract article ID from URL");
          setIsLoading(false);
          return;
        }

        const data = await fetchArticleDetail(articleId);

        if (!data) {
          setError("Article details are not available right now");
          setArticle(null);
          return;
        }

        setArticle(data);
      } catch (err) {
        setError(
          `Error loading article: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchArticleContent();
  }, [articleUrl]);

  function generateArticleMarkdown() {
    if (error) {
      return `# Error\n\n${error}`;
    }

    if (!article) {
      return `# ${articleTitle}\n\nLoading article preview...`;
    }

    const title = article.titulo || articleTitle;
    const lead = article.lead || "";
    const body = article.body ?? "";
    const publishedDate = article.data
      ? formatDate(article.data)
      : "Not available";
    const authors = formatAuthors(article.autores);
    const hasContent = body.trim().length > 0;

    return `# ${title}\n\n*${authors} • ${publishedDate}*\n\n${lead ? `**${lead}**\n\n` : ""}${
      hasContent
        ? body.replace(/<[^>]*>/g, "")
        : "To read the full article, please click 'Open in Browser'.\n\nThe full content of this article is only available on the Público website.*"
    }\n`;
  }

  return (
    <Detail
      markdown={generateArticleMarkdown()}
      isLoading={isLoading}
      navigationTitle={articleTitle}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={articleUrl} />
          <Action.CopyToClipboard
            title="Copy URL"
            content={articleUrl}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
