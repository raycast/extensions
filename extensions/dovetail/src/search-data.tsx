import { Action, ActionPanel, Detail, Icon, List, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { format } from "date-fns";
import { BaseUrl, buildHeaders, endpoints, ExportDataResponse } from "./api/endpoints";
import { useAuth } from "./hooks/useAuth";
import { useSearch } from "./hooks/useSearch";
import { cleanMarkdown, formatFullDate, formatRelativeDate } from "./utils/formatting";

function DataDetail({ dataId }: { dataId: string }) {
  const { token } = useAuth();
  const dataUrl = `https://dovetail.com/data/${dataId}`;

  const { data: markdown, isLoading } = useFetch(BaseUrl + `/v1/data/${dataId}/export/markdown`, {
    headers: buildHeaders(token),
    parseResponse: async (response) => {
      const json = await response.json();
      const data = ExportDataResponse.parse(json.data);
      const created = format(new Date(data.created_at), "dd MMM yyyy");
      let content = cleanMarkdown(data.content_markdown || "");
      content = content.replace(/^\[?AudioVideo.*\n?/im, "");
      return `# ${data.title}\n\n**Created on ${created}**\n\n${content}`;
    },
  });

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle="Data Details"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={dataUrl} title="Open in Dovetail" />
        </ActionPanel>
      }
    />
  );
}

export default function SearchData() {
  const { data, isLoading, onQueryChange, numberOfResults, pagination } = useSearch(endpoints.data);
  const { push } = useNavigation();

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={onQueryChange}
      throttle
      searchBarPlaceholder="Search for data in any project..."
      pagination={pagination}
    >
      <List.Section title="Most relevant" subtitle={numberOfResults}>
        {data.map((item) => (
          <List.Item
            key={item.id}
            title={item.title ?? "Untitled"}
            icon={Icon.Document}
            accessories={[{ text: formatRelativeDate(item.created_at), tooltip: formatFullDate(item.created_at) }]}
            actions={
              <ActionPanel>
                <Action title="Show Details" onAction={() => push(<DataDetail dataId={item.id} />)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
