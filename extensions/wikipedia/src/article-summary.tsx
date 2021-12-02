import { useWikipediaArticle } from "./wikipedia";
import { ActionPanel, CopyToClipboardAction, Detail, OpenInBrowserAction } from "@raycast/api";

export function ArticleSummary({ title }: { title: string }) {
  const { data: article, isValidating } = useWikipediaArticle(title);

  return (
    <Detail
      isLoading={isValidating}
      navigationTitle={title}
      markdown={article ? `# ${title}\n${article.summary}` : null}
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
