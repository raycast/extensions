import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { BridgeClientError, searchTickets } from "./lib/bridge";
import { useWorkspacePicker } from "./lib/use-workspace-picker";
import { AddCommentAction, ChangeStatusAction, LogWorkAction, OpenInMachTriageAction } from "./lib/ticket-actions";
import type { SearchResultItem } from "./lib/types";
import { IssueDetail } from "./view-detail";

const PROVIDER_ICONS: Record<string, Icon> = {
  jira: Icon.Globe,
  linear: Icon.Dot,
  github: Icon.Code,
  local: Icon.Document,
};

const STATUS_COLORS: Record<string, Color> = {
  in_progress: Color.Blue,
  todo: Color.Orange,
  backlog: Color.SecondaryText,
  done: Color.Green,
  canceled: Color.Red,
};

export default function SearchTicketsCommand() {
  const [query, setQuery] = useState("");
  const { workspaceId, dropdown } = useWorkspacePicker();

  const { data, isLoading, error } = useCachedPromise(
    async (q: string, wsId: string | undefined) => {
      try {
        return await searchTickets(q, wsId);
      } catch (e) {
        if (e instanceof BridgeClientError) {
          await showToast({ style: Toast.Style.Failure, title: e.message });
        }
        throw e;
      }
    },
    [query, workspaceId],
    { keepPreviousData: true },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tickets by key, title, or description…"
      searchBarAccessory={dropdown}
      onSearchTextChange={setQuery}
      throttle
    >
      {error && !data ? (
        <List.EmptyView
          title="Not Connected"
          description={error instanceof BridgeClientError ? error.message : "Bridge unavailable"}
          icon={Icon.ExclamationMark}
        />
      ) : !data?.length && !isLoading ? (
        <List.EmptyView
          title={query ? "No Results" : "Start Typing"}
          description={query ? `Nothing matched "${query}"` : "Search across all tickets in your active workspace"}
          icon={query ? Icon.MagnifyingGlass : Icon.Binoculars}
        />
      ) : (
        data?.map((item) => <TicketListItem key={item.id} item={item} />)
      )}
    </List>
  );
}

function TicketListItem({ item }: { item: SearchResultItem }) {
  const statusColor = STATUS_COLORS[item.status] ?? Color.SecondaryText;
  const providerIcon = PROVIDER_ICONS[item.providerType] ?? Icon.Document;

  return (
    <List.Item
      id={item.id}
      title={item.title}
      subtitle={item.externalKey}
      icon={{ source: providerIcon, tintColor: statusColor }}
      accessories={[
        item.assigneeDisplayName ? { text: item.assigneeDisplayName, icon: Icon.Person } : {},
        item.localTrack ? { tag: { value: item.localTrack, color: Color.Blue } } : {},
        { tag: { value: item.status.replace("_", " "), color: statusColor } },
      ].filter((a) => Object.keys(a).length > 0)}
      actions={
        <ActionPanel>
          <Action.Push title="View Detail" icon={Icon.Eye} target={<IssueDetailView issueId={item.id} />} />
          <OpenInMachTriageAction ticket={item} />
          <ChangeStatusAction ticket={item} />
          <AddCommentAction ticket={item} />
          <LogWorkAction ticket={item} />
          <Action.CopyToClipboard
            title="Copy Key"
            content={item.externalKey}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

function IssueDetailView({ issueId }: { issueId: string }) {
  return <IssueDetail issueId={issueId} />;
}
