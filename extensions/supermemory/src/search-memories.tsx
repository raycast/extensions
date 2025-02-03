import { Action, ActionPanel, List } from "@raycast/api";
import { useCachedMemories } from "../lib/hooks";

export default function Command() {
  const { data: memories, isLoading } = useCachedMemories();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search your memories...">
      {/* <List.Section title="Memories">
        {data?.map((memory) => <List.Item key={memory.id} title={memory.title} subtitle={memory.description} />)}
      </List.Section> */}
      {memories &&
        memories.items.map((m) => {
          return (
            <List.Item
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={m.url} />
                </ActionPanel>
              }
              key={m.id}
              title={m.title}
              icon={m.ogImage ?? undefined}
              subtitle={new URL(m.url).hostname}
            ></List.Item>
          );
        })}
    </List>
  );
}
