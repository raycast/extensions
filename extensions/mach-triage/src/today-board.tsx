import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { BridgeClientError, fetchTodayBoard } from "./lib/bridge";
import { useWorkspacePicker } from "./lib/use-workspace-picker";
import { AddCommentAction, ChangeStatusAction, LogWorkAction, OpenInMachTriageAction } from "./lib/ticket-actions";
import type { TodayTicketItem } from "./lib/types";
import { IssueDetail } from "./view-detail";

const SECTION_META: Record<string, { title: string; icon: Icon; color: Color }> = {
  active: { title: "Active", icon: Icon.Play, color: Color.Blue },
  stuck: { title: "Stuck", icon: Icon.ExclamationMark, color: Color.Red },
  next: { title: "Next", icon: Icon.ArrowRight, color: Color.Orange },
  done: { title: "Done Today", icon: Icon.CheckCircle, color: Color.Green },
};

export default function TodayBoardCommand() {
  const { workspaceId, dropdown } = useWorkspacePicker();

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (wsId: string | undefined) => {
      try {
        return await fetchTodayBoard(wsId);
      } catch (e) {
        if (e instanceof BridgeClientError) {
          await showToast({ style: Toast.Style.Failure, title: e.message });
        }
        throw e;
      }
    },
    [workspaceId],
  );

  if (error && !data) {
    return (
      <List>
        <List.EmptyView
          title="Not Connected"
          description={error instanceof BridgeClientError ? error.message : "Bridge unavailable"}
          icon={Icon.ExclamationMark}
        />
      </List>
    );
  }

  const isEmpty =
    !data || (data.active.length === 0 && data.stuck.length === 0 && data.next.length === 0 && data.done.length === 0);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter today's board…" searchBarAccessory={dropdown}>
      {isEmpty && !isLoading ? (
        <List.EmptyView
          title="Board is Empty"
          description="No tickets tracked for today. Use the desktop app to add tickets to Active / Stuck / Next."
          icon={Icon.Calendar}
        />
      ) : (
        (["active", "stuck", "next", "done"] as const).map((track) => {
          const items = data?.[track] ?? [];
          const meta = SECTION_META[track];
          return (
            <List.Section key={track} title={meta.title} subtitle={`${items.length}`}>
              {items.map((item) => (
                <TodayItem key={item.id} item={item} track={track} onRefresh={revalidate} />
              ))}
            </List.Section>
          );
        })
      )}
    </List>
  );
}

function TodayItem({ item, track, onRefresh }: { item: TodayTicketItem; track: string; onRefresh: () => void }) {
  const meta = SECTION_META[track];
  return (
    <List.Item
      id={item.id}
      title={item.title}
      subtitle={item.externalKey}
      icon={{ source: meta.icon, tintColor: meta.color }}
      accessories={[
        item.localTrackNote ? { text: item.localTrackNote, icon: Icon.Pencil } : {},
        item.assigneeDisplayName ? { text: item.assigneeDisplayName, icon: Icon.Person } : {},
        { tag: { value: item.status.replace("_", " "), color: Color.SecondaryText } },
      ].filter((a) => Object.keys(a).length > 0)}
      actions={
        <ActionPanel>
          <Action.Push title="View Detail" icon={Icon.Eye} target={<IssueDetailView issueId={item.id} />} />
          <OpenInMachTriageAction ticket={item} />
          <ChangeStatusAction ticket={item} onDone={onRefresh} />
          <AddCommentAction ticket={item} />
          <LogWorkAction ticket={item} />
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
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
