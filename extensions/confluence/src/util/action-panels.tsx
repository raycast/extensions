import { Action, ActionPanel } from "@raycast/api";

interface URLActionProps {
  url: string;
  title?: string;
}

export const StandardUrlActionPanel = (props: URLActionProps) => {
  return (
    <ActionPanel>
      <StandardUrlActionSection {...props} />
    </ActionPanel>
  );
};

export function StandardUrlActionSection({ url, title }: URLActionProps) {
  return (
    <ActionPanel.Section title={title}>
      <Action.OpenInBrowser title="Open in Browser" url={url} />
      <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd"], key: "." }} />
    </ActionPanel.Section>
  );
}
