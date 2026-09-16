import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { TinkererApiClient } from "../api/client";
import { formatJson } from "../lib/json";
import { jsonMarkdown } from "../lib/results";
import { JsonValue } from "../types/api";

interface JsonDetailProps {
  client: TinkererApiClient;
  data: JsonValue;
  title: string;
  url?: string;
}

export function JsonDetail({ client, data, title, url }: JsonDetailProps) {
  return (
    <Detail
      navigationTitle={title.length > 40 ? "Details" : title}
      markdown={jsonMarkdown(title, data)}
      actions={
        <ActionPanel>
          {url ? <Action.OpenInBrowser title="Open in Browser" url={url} icon={Icon.Globe} /> : null}
          <Action.CopyToClipboard title="Copy JSON" content={formatJson(data)} />
          <Action.OpenInBrowser title="Open API Docs" url={client.docsUrl} icon={Icon.Code} />
        </ActionPanel>
      }
    />
  );
}
