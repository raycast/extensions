import { Action, ActionPanel, Alert, Clipboard, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { HistoryService, type ConversationSummary } from "@/services/historyService";
import { PersistenceService, type ActiveSessionRecord } from "@/services/persistenceService";
import { StorageService } from "@/services/storageService";
import { ConfigService } from "@/services/configService";
import { ErrorHandler } from "@/utils/errors";
import ChatCommand from "@/chat";
import type { ConversationSession } from "@/types/entities";
import type { AgentConfig } from "@/types/extension";

type StatusFilter = ConversationSession["status"] | "all";

function formatTimestamp(date: Date): string {
  return date.toLocaleString();
}

function statusIcon(status: ConversationSession["status"]): Icon {
  switch (status) {
    case "active":
      return Icon.Dot;
    case "archived":
      return Icon.Box;
    case "completed":
      return Icon.Check;
    case "error":
      return Icon.ExclamationMark;
    default:
      return Icon.Circle;
  }
}

interface ConversationListState {
  summaries: ConversationSummary[];
  recoverable: ActiveSessionRecord[];
  agentConfigs: AgentConfig[];
  agentMap: Record<string, string>;
}

const INITIAL_STATE: ConversationListState = {
  summaries: [],
  recoverable: [],
  agentConfigs: [],
  agentMap: {},
};

export function ConversationList(): React.ReactElement {
  const [state, setState] = useState<ConversationListState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const storageService = useMemo(() => new StorageService(), []);
  const historyService = useMemo(() => new HistoryService(storageService), [storageService]);
  const persistenceService = useMemo(() => new PersistenceService(storageService), [storageService]);
  const configService = useMemo(() => new ConfigService(), []);

  const reload = useCallback(
    async (query: string, agentId: string, status: StatusFilter) => {
      const filterOptions =
        status === "all" && agentId === "all"
          ? undefined
          : {
              agentIds: agentId !== "all" ? [agentId] : undefined,
              statuses: status !== "all" ? [status] : undefined,
            };

      try {
        setIsLoading(true);

        const [summaries, recoverable, agentConfigs] = await Promise.all([
          query
            ? historyService.searchConversations(query, filterOptions ?? {})
            : historyService.getConversationSummaries(filterOptions ?? {}),
          persistenceService.getRecoverableSessions(),
          configService.getAgentConfigs(),
        ]);

        const agentMap = agentConfigs.reduce<Record<string, string>>((acc, config) => {
          acc[config.id] = config.name;
          return acc;
        }, {});

        setState({
          summaries,
          recoverable,
          agentConfigs,
          agentMap,
        });
      } catch (error) {
        await ErrorHandler.handleError(error, "Loading conversations");
      } finally {
        setIsLoading(false);
      }
    },
    [configService, historyService, persistenceService],
  );

  useEffect(() => {
    void reload(searchText, agentFilter, statusFilter);
  }, [reload, searchText, agentFilter, statusFilter]);

  const availableAgents = useMemo(() => {
    const fromSummaries = state.summaries.map((summary) => summary.agentConfigId);
    const fromRecoverable = state.recoverable.map((record) => record.agentConfigId);
    const uniqueIds = new Set([...fromSummaries, ...fromRecoverable]);
    return Array.from(uniqueIds);
  }, [state.summaries, state.recoverable]);

  async function handleArchive(sessionId: string) {
    try {
      await storageService.archiveConversation(sessionId);
      await ErrorHandler.showSuccess("Conversation archived");
      await reload(searchText, agentFilter, statusFilter);
    } catch (error) {
      await ErrorHandler.handleError(error, "Archiving conversation");
    }
  }

  async function handleDelete(sessionId: string) {
    const confirmed = await confirmAlert({
      title: "Delete Conversation",
      message: "This action cannot be undone.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    try {
      await storageService.deleteConversation(sessionId);
      await persistenceService.markSessionCompleted(sessionId);
      await ErrorHandler.showSuccess("Conversation deleted");
      await reload(searchText, agentFilter, statusFilter);
    } catch (error) {
      await ErrorHandler.handleError(error, "Deleting conversation");
    }
  }

  async function handleExport(sessionId: string) {
    try {
      const payload = await historyService.exportConversations({
        sessionIds: [sessionId],
        includeContexts: true,
      });
      await Clipboard.copy(payload);
      await showToast(Toast.Style.Success, "Conversation copied", "JSON export copied to clipboard");
    } catch (error) {
      await ErrorHandler.handleError(error, "Exporting conversation");
    }
  }

  async function handleExportAll() {
    try {
      const payload = await historyService.exportConversations({
        includeContexts: true,
      });
      await Clipboard.copy(payload);
      await showToast(Toast.Style.Success, "All conversations copied", "Full history copied to clipboard");
    } catch (error) {
      await ErrorHandler.handleError(error, "Exporting conversations");
    }
  }

  function findAgentConfig(agentId: string): AgentConfig | undefined {
    return state.agentConfigs.find((config) => config.id === agentId);
  }

  function renderSummaryItem(summary: ConversationSummary): React.ReactElement {
    const agentName = state.agentMap[summary.agentConfigId] ?? summary.agentConfigId;
    const title = summary.title ?? summary.preview ?? `Conversation ${summary.sessionId.slice(0, 8)}`;
    const detail = `${summary.messageCount} messages • ${formatTimestamp(summary.lastActivity)}`;

    return (
      <List.Item
        key={summary.sessionId}
        icon={statusIcon(summary.status)}
        title={title}
        subtitle={detail}
        accessories={[{ tag: { value: agentName, color: Color.PrimaryText } }, { date: summary.lastActivity }]}
        actions={
          <ActionPanel>
            <Action.Push
              title="Continue Conversation"
              icon={Icon.Message}
              target={
                <ChatCommand
                  initialSessionId={summary.sessionId}
                  initialAgentId={summary.agentConfigId}
                  initialAgent={findAgentConfig(summary.agentConfigId)}
                />
              }
            />
            <Action title="Archive Conversation" icon={Icon.Box} onAction={() => handleArchive(summary.sessionId)} />
            <Action
              title="Delete Conversation"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={() => handleDelete(summary.sessionId)}
            />
            <Action
              title="Export Conversation JSON"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              onAction={() => handleExport(summary.sessionId)}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => reload(searchText, agentFilter, statusFilter)}
            />
            <Action title="Export All Conversations" icon={Icon.Download} onAction={handleExportAll} />
          </ActionPanel>
        }
      />
    );
  }

  function renderRecoverableItem(record: ActiveSessionRecord): React.ReactElement {
    const agentName = state.agentMap[record.agentConfigId] ?? record.agentConfigId;
    const lastActivity = formatTimestamp(new Date(record.lastActivity));
    const title = record.title ?? `Active session ${record.sessionId.slice(0, 8)}`;

    return (
      <List.Item
        key={`recoverable-${record.sessionId}`}
        icon={Icon.ArrowClockwise}
        title={title}
        subtitle={`Last activity ${lastActivity}`}
        accessories={[{ tag: { value: agentName, color: Color.Blue } }, { text: `${record.messageCount} messages` }]}
        actions={
          <ActionPanel>
            <Action.Push
              title="Resume Conversation"
              icon={Icon.Play}
              target={
                <ChatCommand
                  initialSessionId={record.sessionId}
                  initialAgentId={record.agentConfigId}
                  initialAgent={findAgentConfig(record.agentConfigId)}
                />
              }
            />
            <Action
              title="Dismiss Recovery Entry"
              icon={Icon.XMarkCircle}
              onAction={async () => {
                try {
                  await persistenceService.markSessionCompleted(record.sessionId);
                  setState((prev) => ({
                    ...prev,
                    recoverable: prev.recoverable.filter((item) => item.sessionId !== record.sessionId),
                  }));
                } catch (error) {
                  await ErrorHandler.handleError(error, "Dismissing recovery entry");
                }
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  const statusDropdown = (
    <List.Dropdown
      tooltip="Filter by status"
      onChange={(value) => setStatusFilter(value as StatusFilter)}
      value={statusFilter}
    >
      <List.Dropdown.Item title="All Statuses" value="all" />
      <List.Dropdown.Item title="Active" value="active" />
      <List.Dropdown.Item title="Completed" value="completed" />
      <List.Dropdown.Item title="Archived" value="archived" />
      <List.Dropdown.Item title="Error" value="error" />
    </List.Dropdown>
  );

  const agentDropdown = (
    <List.Dropdown tooltip="Filter by agent" onChange={setAgentFilter} value={agentFilter}>
      <List.Dropdown.Item title="All Agents" value="all" />
      {availableAgents.map((agentId) => (
        <List.Dropdown.Item key={agentId} title={state.agentMap[agentId] ?? agentId} value={agentId} />
      ))}
    </List.Dropdown>
  );

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search conversations..."
      searchBarAccessory={
        <>
          {statusDropdown}
          {agentDropdown}
        </>
      }
    >
      {state.recoverable.length > 0 && (
        <List.Section title="Resume Recent Sessions">{state.recoverable.map(renderRecoverableItem)}</List.Section>
      )}

      {state.summaries.length === 0 ? (
        <List.EmptyView
          icon={Icon.Message}
          title={searchText ? "No Results" : "No Conversations Yet"}
          description={
            searchText
              ? "Try adjusting your search terms or filters."
              : "Start a conversation with an agent to see history here."
          }
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={() => reload(searchText, agentFilter, statusFilter)}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title="Conversation History">{state.summaries.map(renderSummaryItem)}</List.Section>
      )}
    </List>
  );
}

export default ConversationList;
