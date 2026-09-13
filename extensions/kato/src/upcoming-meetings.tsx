import { Action, ActionPanel, Color, Icon, List, Keyboard } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { katoApi } from "./api";
import { CreateCommentForm } from "./create-comment";
import { CreateTaskForm } from "./create-task";
import { formatMeetingTime, groupMeetings, type MeetingGroup } from "./dates";
import { ErrorActions } from "./error-actions";
import { accessTokenOptions } from "./oauth";
import type { ScheduleItem } from "./types";

const GROUPS: MeetingGroup[] = [
  "Happening Now",
  "Next",
  "Later Today",
  "Tomorrow",
  "Later",
];

export function MeetingActions({
  meeting,
  detailToggle,
}: {
  meeting: ScheduleItem;
  detailToggle?: { isShowing: boolean; onToggle: () => void };
}) {
  const openUrl = meeting.joinUrl ?? meeting.externalUrl ?? meeting.webUrl;
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {detailToggle && !detailToggle.isShowing ? (
          <Action
            title="Show Details"
            icon={Icon.Sidebar}
            onAction={detailToggle.onToggle}
          />
        ) : null}
        <Action.OpenInBrowser
          title={
            meeting.joinUrl
              ? "Join Meeting"
              : meeting.source === "meeting"
                ? "Open in Kato"
                : "Open Event"
          }
          icon={meeting.joinUrl ? Icon.Video : Icon.Calendar}
          url={openUrl}
          shortcut={{ modifiers: [], key: "return" }}
        />
        {detailToggle?.isShowing ? (
          <Action
            title="Hide Details"
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={detailToggle.onToggle}
          />
        ) : null}
        {openUrl !== meeting.webUrl ? (
          <Action.OpenInBrowser title="Open in Kato" url={meeting.webUrl} />
        ) : null}
        <Action.Push
          title="Create Follow-Up Task"
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          target={
            <CreateTaskForm
              context={{
                meetingId: meeting.linkedMeetingId ?? undefined,
                label: meeting.title,
                suggestedTitle: `Follow up: ${meeting.title}`,
              }}
            />
          }
        />
        {meeting.source === "meeting" && meeting.detailLevel === "full" ? (
          <Action.Push
            title="Comment on Meeting"
            icon={Icon.Message}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
            target={
              <CreateCommentForm
                context={{
                  entityType: "meeting",
                  entityId: meeting.id,
                  label: meeting.title,
                }}
              />
            }
          />
        ) : null}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {meeting.joinUrl ? (
          <Action.CopyToClipboard
            title="Copy Join Link"
            content={meeting.joinUrl}
          />
        ) : null}
        <Action.CopyToClipboard
          title="Copy Kato Link"
          content={meeting.webUrl}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function UpcomingMeetingsCommand() {
  const [meetings, setMeetings] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  async function load() {
    setIsLoading(true);
    setError(undefined);
    try {
      setMeetings(await katoApi.upcomingMeetings());
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => void load(), []);
  const groups = useMemo(() => groupMeetings(meetings), [meetings]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Filter meetings…"
    >
      {error ? (
        <List.EmptyView
          title="Could not load meetings"
          description={error}
          icon={Icon.Warning}
          actions={
            <ErrorActions
              command="upcoming-meetings"
              onRetry={() => void load()}
            />
          }
        />
      ) : null}
      {!error && !isLoading && meetings.length === 0 ? (
        <List.EmptyView
          title="No upcoming meetings"
          description="Your schedule is clear."
          icon={Icon.Calendar}
        />
      ) : null}
      {GROUPS.map((group) =>
        groups[group].length ? (
          <List.Section
            key={group}
            title={group}
            subtitle={`${groups[group].length}`}
          >
            {groups[group].map((meeting) => (
              <List.Item
                key={`${meeting.source}-${meeting.id}`}
                icon={{
                  source: meeting.joinUrl ? Icon.Video : Icon.Calendar,
                  tintColor:
                    group === "Happening Now" ? Color.Green : Color.PrimaryText,
                }}
                title={meeting.title}
                subtitle={meeting.location ?? meeting.calendarName}
                accessories={[{ text: formatMeetingTime(meeting) }]}
                detail={
                  <List.Item.Detail
                    markdown={
                      meeting.description ||
                      (meeting.detailLevel === "busy"
                        ? "_Details are private_"
                        : "_No description_")
                    }
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label
                          title="When"
                          text={`${new Date(meeting.startTime).toLocaleString()} – ${new Date(meeting.endTime).toLocaleTimeString()}`}
                        />
                        {meeting.location ? (
                          <List.Item.Detail.Metadata.Label
                            title="Location"
                            text={meeting.location}
                          />
                        ) : null}
                        <List.Item.Detail.Metadata.Label
                          title="Source"
                          text={
                            meeting.source === "meeting"
                              ? "Kato"
                              : (meeting.calendarName ?? "Calendar")
                          }
                        />
                        <List.Item.Detail.Metadata.Link
                          title="Kato"
                          target={meeting.webUrl}
                          text="Open details"
                        />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={<MeetingActions meeting={meeting} />}
              />
            ))}
          </List.Section>
        ) : null,
      )}
    </List>
  );
}

export default withAccessToken(accessTokenOptions)(UpcomingMeetingsCommand);
