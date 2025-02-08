import { useMemo, useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import AgentCreate from "./components/AgentCreate";
import { useAgents } from "./lib/hooks";

const getDeeplink = (agent: string) => {
  const jsonData = { agent };
  const searchParams = new URLSearchParams({ context: JSON.stringify(jsonData) });
  return `raycast://extensions/SmithYe/ask-ai-quick/index?${searchParams.toString()}`;
};

export default function AgentList() {
  const [search, setSearch] = useState("");
  const { agents, delAgent, isLoading } = useAgents();
  const searchAgents = useMemo(() => {
    return agents?.filter((items) => items.name.includes(search) || items.prompt.includes(search)) ?? [];
  }, [agents, search]);

  async function deleteAgent(name: string) {
    await delAgent(name);
  }

  return (
    <List isShowingDetail isLoading={isLoading} onSearchTextChange={(newValue) => setSearch(newValue)}>
      <List.Item
        icon={{ source: Icon.Plus }}
        title="Add new agent..."
        detail={<List.Item.Detail markdown="## Add new AI Agent" />}
        actions={
          <ActionPanel>
            <Action.Push title="Add Agent" target={<AgentCreate />} />
          </ActionPanel>
        }
      />
      {searchAgents.length === 0 ? (
        <List.EmptyView title="Not found agents" />
      ) : (
        searchAgents.map((agent) => (
          <List.Item
            key={agent.name}
            title={agent.name}
            detail={<List.Item.Detail markdown={agent.prompt} />}
            actions={
              !agent.isBuiltIn && (
                <ActionPanel>
                  <Action.CreateQuicklink quicklink={{ link: getDeeplink(agent.name) }} />
                  <Action
                    title="Delete"
                    style={Action.Style.Destructive}
                    onAction={() => deleteAgent(agent.name)}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                </ActionPanel>
              )
            }
          />
        ))
      )}
    </List>
  );
}
