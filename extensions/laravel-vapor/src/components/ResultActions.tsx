import { Action, ActionPanel } from "@raycast/api";
export interface Props {
  id: string | number;
  title: string;
  type: "cache" | "database" | "domain" | "network" | "project";
}

export default function ResultActions(props: Props) {
  const { id, title, type } = props;

  const urlBases = {
    cache: "https://vapor.laravel.com/app/caches/",
    database: "https://vapor.laravel.com/app/databases/",
    domain: "https://vapor.laravel.com/app/domains/",
    network: "https://vapor.laravel.com/app/networks/",
    project: "https://vapor.laravel.com/app/projects/",
  };

  const url = urlBases[type] + id;

  return (
    <ActionPanel title={title}>
      <ActionPanel.Section>
        <Action.OpenInBrowser url={url} />
        <Action.CopyToClipboard content={url} title="Copy Link" shortcut={{ modifiers: ["cmd"], key: "." }} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
