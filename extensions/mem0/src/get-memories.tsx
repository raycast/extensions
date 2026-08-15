import { List, Action, ActionPanel, Icon, getPreferenceValues, Keyboard } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";

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

export default function Command() {
  const { mem0ApiKey, defaultUserId } = getPreferenceValues<Preferences>();
  const [totalCount, setTotalCount] = useCachedState<number>("MEM0-TOTAL-COUNT", 0);

  const {
    isLoading,
    data: memories,
    error,
  } = useFetch(
    (options) => `${API_BASE_URL}/memories/?user_id=${defaultUserId}&page=${options.page + 1}&page_size=50`,
    {
      headers: {
        Authorization: `Token ${mem0ApiKey}`,
        "Content-Type": "application/json",
      },
      mapResult(result) {
        const data = result as ApiResponse;
        setTotalCount(data.count);
        return {
          data: data.results,
          hasMore: data.next !== null,
        };
      },
      initialData: [],
    },
  );

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
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
