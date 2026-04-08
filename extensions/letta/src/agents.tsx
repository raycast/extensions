/**
 * Manage Agents Command
 *
 * List, select, and manage your Letta agents across all accounts.
 * Set an agent as active to chat with it.
 */

import { Action, ActionPanel, Icon, List, showToast, Toast, Color } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { useLettaClient, useAgents } from "./hooks";
import ChatCommand from "./chat";

export default function AgentsCommand() {
  const { accounts, getClientForAccount } = useLettaClient();
  const [searchText, setSearchText] = useState("");
  const { agents, isLoading, activeAgentId, setActiveAgentId, error, revalidate } = useAgents(
    accounts,
    getClientForAccount,
    searchText
  );

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error loading agents",
      message: String(error),
    });
  }

  const hasAgents = agents && agents.length > 0;

  // Group agents by account
  const agentsByAccount = useMemo(() => {
    const groups = new Map<string, typeof agents>();
    for (const agent of agents || []) {
      const existing = groups.get(agent.accountId) || [];
      existing.push(agent);
      groups.set(agent.accountId, existing);
    }
    return groups;
  }, [agents]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search agents..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Manage Agents"
    >
      {!isLoading && !hasAgents && (
        <List.EmptyView
          icon={Icon.Person}
          title="No Agents Found"
          description="Create agents at app.letta.com, then refresh"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser icon={Icon.Globe} title="Open Letta" url="https://app.letta.com" />
              <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      )}

      {Array.from(agentsByAccount.entries()).map(([accountId, accountAgents]) => {
        const accountName = accountAgents?.[0]?.accountName || accountId;

        return (
          <List.Section key={accountId} title={accountName} subtitle={`${accountAgents?.length || 0} agents`}>
            {accountAgents?.map((agent) => {
              const isActive = agent.id === activeAgentId;

              return (
                <List.Item
                  key={agent.id}
                  icon={isActive ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Person}
                  title={agent.name}
                  subtitle={agent.description ?? ""}
                  accessories={[...(isActive ? [{ tag: { value: "Active", color: Color.Green } }] : [])]}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section>
                        {!isActive && (
                          <Action
                            icon={Icon.CheckCircle}
                            title="Set as Active Agent"
                            onAction={async () => {
                              await setActiveAgentId(agent.id);
                              showToast({
                                style: Toast.Style.Success,
                                title: "Active agent set",
                                message: `${agent.name} (${agent.accountName})`,
                              });
                            }}
                          />
                        )}
                        <Action.Push
                          icon={Icon.Message}
                          title="Chat with Agent"
                          target={<ChatWithAgent agentId={agent.id} />}
                        />
                      </ActionPanel.Section>

                      <ActionPanel.Section>
                        <Action
                          icon={Icon.ArrowClockwise}
                          title="Refresh Agents"
                          shortcut={{ modifiers: ["cmd"], key: "r" }}
                          onAction={() => revalidate()}
                        />
                        <Action.OpenInBrowser
                          icon={Icon.Globe}
                          title="Create New Agent"
                          shortcut={{ modifiers: ["cmd"], key: "n" }}
                          url="https://app.letta.com"
                        />
                      </ActionPanel.Section>

                      <ActionPanel.Section>
                        <Action.OpenInBrowser
                          icon={Icon.Globe}
                          title="Open in Letta App"
                          url={`https://app.letta.com/agents/${agent.id}`}
                        />
                        <Action.CopyToClipboard
                          icon={Icon.Clipboard}
                          title="Copy Agent ID"
                          content={agent.id}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}

/**
 * Quick chat view when selecting an agent - opens the unified chat
 * with this agent pre-selected
 */
function ChatWithAgent({ agentId }: { agentId: string }) {
  const { accounts, getClientForAccount } = useLettaClient();
  const { setActiveAgentId } = useAgents(accounts, getClientForAccount);

  // Set as active when component mounts (not during render!)
  useEffect(() => {
    setActiveAgentId(agentId);
  }, [agentId]);

  // The ChatCommand will pick up the active agent from storage
  return <ChatCommand />;
}
