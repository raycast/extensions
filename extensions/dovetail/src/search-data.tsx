import { Icon, List, ActionPanel, Action, Detail, useNavigation } from "@raycast/api";
import { Data } from "./types/dovetail";
import { formatRelativeDate, formatFullDate, cleanMarkdown } from "./utils/formatting";
import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { getDataExportMarkdown } from "./api/client";
import { useSearch } from "./hooks/useSearch";
import { getData } from "./api/client";
import { format } from "date-fns";

function DataDetail({ dataId }: { dataId: string }) {
  const { token } = useAuth();
  const [markdown, setMarkdown] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const dovetailUrl = `https://dovetail.com/data/${dataId}`;

  useEffect(() => {
    async function fetchMarkdown() {
      setIsLoading(true);
      try {
        const data = await getDataExportMarkdown(dataId, token);
        const created = format(new Date(data.created_at), "dd MMM yyyy");
        let content = cleanMarkdown(data.content_markdown || "");
        content = content.replace(/^\[?AudioVideo.*\n?/im, "");
        setMarkdown(`# ${data.title}\n\n**Created on ${created}**\n\n${content}`);
      } catch (e) {
        setMarkdown("Failed to load data export.");
      }
      setIsLoading(false);
    }
    fetchMarkdown();
  }, [dataId, token]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle="Data Details"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={dovetailUrl} title="Open in Dovetail" />
        </ActionPanel>
      }
    />
  );
}

export default function SearchData() {
  const { data, isLoading, onSearchTextChange, numberOfResults } = useSearch<Data>(getData);
  const { push } = useNavigation();

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={onSearchTextChange}
      throttle
      searchBarPlaceholder="Search for data in any project..."
    >
      <List.Section title="Most relevant" subtitle={numberOfResults}>
        {data.map((item) => (
          <List.Item
            key={item.id}
            title={item.title || "Untitled"}
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
