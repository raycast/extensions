import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { createDeeplink } from "@raycast/utils";
import { useEffect } from "react";
import { useAgents } from "./askAgent";
import { getAgentScopeConfig } from "./utils";
import { getDustClient, withPickedWorkspace } from "./dust_api/oauth";

function buildAgentSelectionQuicklink(agentId: string) {
  return createDeeplink({ command: "replaceSelectionWithAgent", context: { agentId } });
}

export default withPickedWorkspace(function SetUpReplaceSelectionCommand() {
  const dustClient = getDustClient();
  const { agents, isLoading, error } = useAgents(dustClient);

  useEffect(() => {
    if (error) {
      showToast({ style: Toast.Style.Failure, title: `Could not load agents: ${error}` });
    }
  }, [error]);

  const sortedAgents = agents ? [...agents].sort((a, b) => a.name.localeCompare(b.name)) : undefined;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Pick an agent to create a Quicklink for...">
      {!isLoading && (!sortedAgents || sortedAgents.length === 0) && (
        <List.EmptyView icon={Icon.XMarkCircle} title="No Dust agents loaded" />
      )}
      {sortedAgents?.map((agent) => {
        const config = getAgentScopeConfig(agent.scope);
        return (
          <List.Item
            key={agent.sId}
            title={`@${agent.name}`}
            subtitle={agent.description}
            accessories={[{ tag: { value: config.label, color: config.color } }]}
            actions={
              <ActionPanel>
                <Action.CreateQuicklink
                  title="Create Quicklink…"
                  icon={Icon.Repeat}
                  quicklink={{
                    name: `Fix Selection with ${agent.name}`,
                    link: buildAgentSelectionQuicklink(agent.sId),
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
});
