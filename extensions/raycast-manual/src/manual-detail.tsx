import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { htmlToMarkdown } from "./lib/html-to-markdown";
import type { ManualPage } from "./lib/pages";

type Props = {
  page: ManualPage;
};

export function ManualDetail({ page }: Props) {
  const { data, isLoading, error } = useFetch<string>(page.url, {
    parseResponse: async (res) => {
      if (!res.ok) throw new Error(`Failed to load page (HTTP ${res.status})`);
      return res.text();
    },
  });

  const markdown = useMemo(() => {
    if (error) {
      return `# ${page.title}\n\n_Failed to load the page._\n\n${error.message}`;
    }
    if (!data) return `# ${page.title}\n\n_Loading…_`;
    const body = htmlToMarkdown(data, page.url);
    const header = `# ${page.title}\n\n`;
    return body ? header + body : `${header}_No readable content found. Open in browser instead._`;
  }, [data, error, page.url, page.title]);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={page.title}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={page.url} />
          <Action.CopyToClipboard
            title="Copy URL"
            content={page.url}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "." }, Windows: { modifiers: ["ctrl"], key: "." } }}
          />
          <Action.CopyToClipboard
            title="Copy as Markdown"
            content={markdown}
            icon={Icon.Clipboard}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "c" },
              Windows: { modifiers: ["ctrl", "shift"], key: "c" },
            }}
          />
        </ActionPanel>
      }
    />
  );
}
