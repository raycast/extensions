import { useWikipediaPageContent, useWikipediaPageSummary } from "./wikipedia";
import { ActionPanel, CopyToClipboardAction, Detail, OpenInBrowserAction } from "@raycast/api";

export function PageDetail({ title }: { title: string }) {
  const { data: content, isValidating } = useWikipediaPageContent(title);
  const { data: summary } = useWikipediaPageSummary(title);

  return (
    <Detail
      isLoading={isValidating}
      navigationTitle={title}
      markdown={content}
      actions={
        summary ? (
          <ActionPanel>
            <ActionPanel.Section>
              <OpenInBrowserAction url={`https://wikipedia.org/wiki/${title}`} />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <CopyToClipboardAction
                title="Copy URL"
                shortcut={{ modifiers: ["cmd"], key: "." }}
                content={`https://wikipedia.org/wiki/${title}`}
              />
              <CopyToClipboardAction
                title="Copy Summary"
                shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                content={summary}
              />
            </ActionPanel.Section>
          </ActionPanel>
        ) : null
      }
    />
  );
}
