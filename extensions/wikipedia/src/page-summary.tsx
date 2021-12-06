import { useWikipediaPageExtract } from "./wikipedia";
import { ActionPanel, CopyToClipboardAction, Detail, OpenInBrowserAction } from "@raycast/api";

function getPageMarkdown(title: string, extract?: string) {
  if (!extract) {
    return null;
  }
  if (!extract) {
    return `# ${title}\n*No extract found for this page*`;
  }
  return `# ${title}\n${extract}`;
}

export function PageSummary({ title }: { title: string }) {
  const { data: extract, isValidating } = useWikipediaPageExtract(title);
  const markdown = getPageMarkdown(title, extract);

  return (
    <Detail
      isLoading={isValidating}
      navigationTitle={title}
      markdown={markdown}
      actions={
        extract ? (
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
                title="Copy Extract"
                shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                content={extract}
              />
            </ActionPanel.Section>
          </ActionPanel>
        ) : null
      }
    />
  );
}
