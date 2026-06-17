import { JSX } from "react";
import { Action, ActionPanel } from "@raycast/api";

interface URLActionProps {
  url: string;
  title?: string;
  other?: React.ReactNode;
}

export const StandardUrlActionPanel = (props: URLActionProps) => {
  return (
    <ActionPanel>
      <StandardUrlActionSection {...props} />
    </ActionPanel>
  );
};

export function StandardUrlActionSection({ url, title, other }: URLActionProps) {
  return (
    <ActionPanel.Section title={title}>
      <Action.OpenInBrowser title="Open in Browser" url={url} />
      <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd"], key: "." }} />
      {other as JSX.Element}
    </ActionPanel.Section>
  );
}
