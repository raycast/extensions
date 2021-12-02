import { useWikipediaArticle } from "./wikipedia";
import { ActionPanel, CopyToClipboardAction, Detail, OpenInBrowserAction } from "@raycast/api";

function getArticleMarkdown(article?: { summary: string, title: string }) {
  if (!article) {
    return null;
  }
  if (!article.summary) {
    return `# ${article.title}\n*No summary found for this article*`;
  }
  return `# ${article.title}\n${article.summary}`;
}

export function ArticleSummary({ title }: { title: string }) {
  const { data: article, isValidating } = useWikipediaArticle(title);
  const markdown = getArticleMarkdown(article);

  return (
    <Detail
      isLoading={isValidating}
      navigationTitle={title}
      markdown={markdown}
      actions={
        article ? (
          <ActionPanel>
            <ActionPanel.Section>
              <OpenInBrowserAction url={article.url} />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <CopyToClipboardAction
                title="Copy URL"
                shortcut={{ modifiers: ["cmd"], key: "." }}
                content={article.url}
              />
              <CopyToClipboardAction
                title="Copy Summary"
                shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                content={article.summary}
              />
            </ActionPanel.Section>
          </ActionPanel>
        ) : null
      }
    />
  );
}
