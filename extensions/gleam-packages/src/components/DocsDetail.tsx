import { Action, ActionPanel, Detail } from "@raycast/api";

type DocsDetailProps = {
  name: string;
  markdown: string;
  url: string;
};

export default function DocsDetail({ name, markdown, url }: DocsDetailProps) {
  return (
    <Detail
      navigationTitle={name}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={url} />
          <Action.CopyToClipboard
            title="Copy Link"
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            content={url}
          />
        </ActionPanel>
      }
    />
  );
}
