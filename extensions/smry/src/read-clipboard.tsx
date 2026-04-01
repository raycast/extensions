import { Action, ActionPanel, Clipboard, Detail, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Article, fetchArticle, getSmryUrl, htmlToMarkdown, isValidUrl, normalizeUrl } from "./api";

export default function ReadClipboard() {
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clipboardUrl, setClipboardUrl] = useState<string>("");

  useEffect(() => {
    async function run() {
      try {
        const text = await Clipboard.readText();
        const raw = text?.trim() || "";
        const url = raw ? normalizeUrl(raw) : "";

        if (!url || !isValidUrl(url)) {
          setError("No valid URL found in clipboard. Copy an article URL first.");
          setIsLoading(false);
          return;
        }

        setClipboardUrl(url);
        showToast({ style: Toast.Style.Animated, title: "Reading article..." });
        const data = await fetchArticle(url);
        setArticle(data);
        setIsLoading(false);
        showToast({ style: Toast.Style.Success, title: "Article loaded" });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setIsLoading(false);
        showToast({ style: Toast.Style.Failure, title: "Failed", message });
      }
    }

    run();
  }, []);

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}`}
        actions={
          clipboardUrl ? (
            <ActionPanel>
              <Action.OpenInBrowser title="Open in SMRY" url={getSmryUrl(clipboardUrl)} />
            </ActionPanel>
          ) : undefined
        }
      />
    );
  }

  const markdown = article
    ? formatArticle(article)
    : "Loading article from clipboard URL...";

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
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

function formatArticle(article: Article): string {
  let md = "";
  if (article.image) md += `![](${article.image})\n\n`;
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
