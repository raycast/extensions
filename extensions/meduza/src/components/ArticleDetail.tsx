import { ActionPanel, Action, Detail } from "@raycast/api";
import { format } from "timeago.js";
import { ArticleDetailProps } from "../types";
import { stripHtml } from "../utils/helpers";

export function ArticleDetail({ article, locale }: ArticleDetailProps): JSX.Element {
  const featuredImage = article.enclosure?.url || article.icon;

  const markdown = `
![Featured Image](${featuredImage})

${format(new Date(article.pubDate), locale)}

${stripHtml(article.content)}
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={article.title}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title={article.title} text={format(new Date(article.pubDate), locale)} />
          <Detail.Metadata.Link title="Original Article" target={article.link} text="Open in Browser" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={article.link} />
          <Action.CopyToClipboard
            content={article.link}
            title="Copy Link"
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
