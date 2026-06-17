import { useFetch } from "@raycast/utils";
import { API_HEADERS, generateApiUrl } from "./api";
import { ISOImageResource } from "./types";
import { Action, ActionPanel, Icon, List } from "@raycast/api";

export default function ISOImages() {
  const { isLoading, data: isos } = useFetch(generateApiUrl("iso_images"), {
    headers: API_HEADERS,
    mapResult(result: { data: ISOImageResource[] }) {
      return {
        data: result.data,
      };
    },
    initialData: [],
  });

  return (
    <List isLoading={isLoading}>
      {isos.map((iso) => (
        <List.Item
          icon={Icon.Cd}
          key={iso.id}
          title={iso.name}
          subtitle={iso.os_type}
          accessories={[{ text: `${(iso.size / 1024 / 1024 / 1024).toFixed(2)} GiB` }]}
          actions={
            <ActionPanel>
              {/* eslint-disable-next-line @raycast/prefer-title-case */}
              <Action.CopyToClipboard title="Copy ISO URL to Clipboard" content={iso.iso_url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
