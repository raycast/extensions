import { Action, ActionPanel, Detail, LaunchProps, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Article, fetchArticle, getSmryUrl, htmlToMarkdown, isValidUrl, normalizeUrl } from "./api";

interface Arguments {
  url: string;
}

export default function ReadArticle(props: LaunchProps<{ arguments: Arguments }>) {
  const url = props.arguments.url ? normalizeUrl(props.arguments.url) : "";
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setError("Please provide a URL");
      setIsLoading(false);
      return;
    }

    showToast({ style: Toast.Style.Animated, title: "Reading article..." });
    fetchArticle(url)
      .then((data) => {
        setArticle(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
        showToast({ style: Toast.Style.Failure, title: "Failed to load article", message: err.message });
      });
  }, [url]);

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}`}
        actions={
          <ActionPanel>
            {url && isValidUrl(url) && (
              <Action.OpenInBrowser title="Open in SMRY" url={getSmryUrl(url)} />
            )}
          </ActionPanel>
        }
      />
    );
  }

  const markdown = article
    ? formatArticle(article)
    : "Loading article...";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={article?.title || "Reading..."}
      metadata={
        article ? (
          <Detail.Metadata>
            {article.siteName && <Detail.Metadata.Label title="Source" text={article.siteName} />}
            {article.byline && <Detail.Metadata.Label title="Author" text={article.byline} />}
            {article.publishedDate && <Detail.Metadata.Label title="Published" text={article.publishedDate} />}
            <Detail.Metadata.Link title="Original" target={article.url} text="Open Original" />
            <Detail.Metadata.Link title="SMRY" target={getSmryUrl(article.url)} text="Open in SMRY" />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        article ? (
          <ActionPanel>
            <Action.OpenInBrowser title="Open in SMRY" url={getSmryUrl(article.url)} />
            <Action.OpenInBrowser title="Open Original" url={article.url} shortcut={{ modifiers: ["cmd"], key: "o" }} />
            <Action.CopyToClipboard title="Copy Article Text" content={article.textContent} shortcut={{ modifiers: ["cmd"], key: "c" }} />
            <Action.CopyToClipboard title="Copy URL" content={article.url} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

function formatArticle(article: Article): string {
  let md = "";

  if (article.image) {
    md += `![](${article.image})\n\n`;
  }

  md += `# ${article.title}\n\n`;

  if (article.byline) {
    md += `*${article.byline}*`;
    if (article.siteName) md += ` | ${article.siteName}`;
    md += "\n\n---\n\n";
  } else if (article.siteName) {
    md += `*${article.siteName}*\n\n---\n\n`;
  }

  md += htmlToMarkdown(article.content);

  return md;
}
