import { List, Action, ActionPanel, Icon, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";

const API_BASE_URL = "https://api.mem0.ai/v1";

interface Memory {
  id: string;
  memory: string;
  agent_id: string;
  hash: string;
  metadata: object;
  immutable: boolean;
  created_at: string;
  updated_at: string;
  categories: object;
}

interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Memory[];
}

interface Preferences {
  mem0ApiKey: string;
  defaultUserId: string;
}

export default function Command() {
  const { mem0ApiKey, defaultUserId } = getPreferenceValues<Preferences>();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMemories() {
      try {
        const response = await fetch(`${API_BASE_URL}/memories/?user_id=${defaultUserId}&page=1&page_size=50`, {
          method: "GET",
          headers: {
            Authorization: `Token ${mem0ApiKey}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = (await response.json()) as ApiResponse;
        setMemories(data.results || []);
        setTotalCount(data.count || 0);
        setNextPage(data.next || null);
      } catch (error) {
        console.error("Failed to fetch memories:", error);
        setError(error instanceof Error ? error.message : "An error occurred");
        setMemories([]);
        setTotalCount(0);
        setNextPage(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMemories();
  }, [mem0ApiKey, defaultUserId]);

  if (error) {
    return (
      <List>
        <List.Item title={`Error: ${error}`} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle={`Memories (${totalCount} total)`}>
      {memories.map((memory) => (
        <List.Item
          key={memory.id}
          title={memory.memory}
          subtitle={memory.agent_id}
          accessories={[
            { text: new Date(memory.created_at).toLocaleString() },
            { icon: Icon.Clipboard, tooltip: "Copy Memory" },
          ]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Memory"
                content={memory.memory}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
      {nextPage && (
        <List.Item icon="⏩" title="Load Next Page" subtitle={`${memories.length} of ${totalCount} memories loaded`} />
      )}
    </List>
  );
}
