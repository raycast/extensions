import { Icon, List, ActionPanel, Action, Detail, useNavigation } from "@raycast/api";
import { useDataSearch } from "./hooks/useDataSearch";
import { Data } from "./types/dovetail";
import { format, differenceInDays } from "date-fns";
import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { getDataExportHtml, getDataExportMarkdown } from "./api/client";

function formatRelativeDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const days = differenceInDays(now, date);
  if (days < 1) return "1d";
  if (days < 7) return `${days + 1}d`;
  return format(date, "MMM d");
}
function formatFullDate(dateString: string) {
  const date = new Date(dateString);
  return `Created: ${format(date, "EEEE d MMMM yyyy 'at' HH:mm")}`;
}

function cleanMarkdown(md: string): string {
  // Example: Remove leading/trailing whitespace, fix double newlines, etc.
  return md
    .replace(/\n{3,}/g, '\n\n') // No more than 2 newlines in a row
    .replace(/^\s+|\s+$/g, '')   // Trim
    .replace(/\n\s+\n/g, '\n\n'); // Remove whitespace-only lines
}

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
        // Remove the old AudioVideo line if present
        content = content.replace(/^\[?AudioVideo.*\n?/im, "");
        setMarkdown(
          `# ${data.title}\n\n**Created on ${created}**\n\n${content}`
        );
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
  const { data, isLoading, onSearchTextChange, numberOfResults } = useDataSearch();
  const { push } = useNavigation();
  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={onSearchTextChange}
      throttle
      searchBarPlaceholder="Search for data in any project..."
    >
      <List.Section title="Most relevant" subtitle={numberOfResults}>
        {data.map((item: Data) => (
          <List.Item
            key={item.id}
            title={item.title || "Untitled"}
            icon={Icon.Document}
            accessories={[{ text: formatRelativeDate(item.created_at), tooltip: formatFullDate(item.created_at) }]}
            actions={
              <ActionPanel>
                <Action
                  title="Show Details"
                  onAction={() => push(<DataDetail dataId={item.id} />)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
} 