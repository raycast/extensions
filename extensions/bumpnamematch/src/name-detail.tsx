import { Action, ActionPanel, Detail, Keyboard } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { SaveActions } from "./save-actions";
import { buildNameMarkdown, NameMetadata } from "./name-detail-content";
import { type FavoriteList } from "./lib/api";
import { type NameDetailResponse } from "./lib/types";

export function NameDetail({
  name,
  baseUrl,
  apiKey,
  lists = [],
}: {
  name: string;
  baseUrl: string;
  apiKey?: string;
  lists?: FavoriteList[];
}) {
  const slug = encodeURIComponent(name.toLowerCase());
  const { data, isLoading } = useFetch<NameDetailResponse>(`${baseUrl}/api/names/${slug}`);
  const nameData = data?.name;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={name}
      markdown={nameData ? buildNameMarkdown(nameData) : `# ${name}`}
      metadata={nameData ? <NameMetadata nameData={nameData} baseUrl={baseUrl} /> : undefined}
      actions={
        <ActionPanel>
          {nameData && <SaveActions nameId={nameData.id} baseUrl={baseUrl} apiKey={apiKey} lists={lists} />}
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={`${baseUrl}/name/${slug}`} />
            <Action.CopyToClipboard title="Copy Name" content={name} shortcut={Keyboard.Shortcut.Common.Pin} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
