import { Detail, ActionPanel, Action } from "@raycast/api";
import { Article, formatDate } from "../utils";
import React from "react";

interface ArticleDetailProps {
  article: Article;
}

export default function ArticleDetail({ article }: ArticleDetailProps) {
  // Format the content for display
  const content = `
# ${article.title}

*Published on ${formatDate(article.pubDate)}${article.creator ? ` by ${article.creator}` : ""}*

${article.categories && article.categories.length > 0 ? `**Categories:** ${article.categories.join(", ")}\n\n` : ""}

${article.content || article.description || "No content available"}
  `;

  return (
    <Detail
      markdown={content}
      navigationTitle={article.title}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={article.link} />
          <Action.CopyToClipboard
            title="Copy Link"
            content={article.link}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
