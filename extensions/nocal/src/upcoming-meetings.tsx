import { Action, ActionPanel, Color, Icon, List, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { listUpcomingMeetings, type Event } from "./api";
import {
  ErrorState,
  formatDateTime,
  formatRsvpStatus,
  getMeetingAccessories,
  getSelfRsvpStatus,
  meetingIcon,
  noteSnippetMarkdown,
  openNocalDeepLink,
} from "./components";

function sortMeetingsByStartTime(meetings: Event[]) {
  return [...meetings].sort(
    (left, right) => new Date(left.start_time).getTime() - new Date(right.start_time).getTime(),
  );
}

function isMeetingActive(meeting: Event) {
  if (meeting.is_all_day) {
    return false;
  }

  const now = Date.now();
  const start = new Date(meeting.start_time).getTime();
  const end = new Date(meeting.end_time).getTime();

  return start <= now && now <= end;
}

export default function UpcomingMeetingsCommand() {
  const [meetings, setMeetings] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const loadMeetings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await listUpcomingMeetings();
      setMeetings(sortMeetingsByStartTime(response.results));
    } catch (newError) {
      setError(newError);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadMeetings();
  }, []);

  return (
    <List isLoading={isLoading}>
      {error ? <ErrorState title="Couldn’t Load Meetings" error={error} onRetry={() => void loadMeetings()} /> : null}
      {!error && !isLoading && meetings.length === 0 ? (
        <List.EmptyView title="No Upcoming Meetings" description="Nothing is scheduled in the next 3 days." />
      ) : null}
      {meetings.map((meeting) =>
        (() => {
          const selfRsvpStatus = getSelfRsvpStatus(meeting.attendees);
          const isActive = isMeetingActive(meeting);
          const accessories = getMeetingAccessories(
            meeting.start_time,
            meeting.is_all_day,
            meetingIcon(selfRsvpStatus, meeting.status),
          );

          const hasVideo = Boolean(meeting.conferencing_details?.join_url);

          if (isActive) {
            const nowTag = hasVideo
              ? {
                  tag: { value: "▶ Join Now", color: Color.Green },
                  tooltip: "Press ↵ to join the video call",
                }
              : {
                  tag: { value: "Now" },
                  tooltip: "This meeting is happening now",
                };
            accessories.unshift(nowTag);
          }

          return (
            <List.Item
              key={meeting.id}
              icon={isActive && hasVideo ? { source: Icon.Video, tintColor: Color.Green } : Icon.Calendar}
              title={meeting.title || "Untitled Meeting"}
              subtitle={meeting.location || undefined}
              accessories={accessories}
              detail={
                <List.Item.Detail
                  markdown={`# ${meeting.title || "Untitled Meeting"}\n\n${noteSnippetMarkdown(meeting.description)}${
                    meeting.recurrence_summary ? `\n\n**Recurs:** ${meeting.recurrence_summary}` : ""
                  }`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Starts"
                        text={formatDateTime(meeting.start_time, meeting.is_all_day)}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Ends"
                        text={formatDateTime(meeting.end_time, meeting.is_all_day)}
                      />
                      {selfRsvpStatus ? (
                        <List.Item.Detail.Metadata.Label title="Your RSVP" text={formatRsvpStatus(selfRsvpStatus)} />
                      ) : null}
                      {meeting.location ? (
                        <List.Item.Detail.Metadata.Label title="Location" text={meeting.location} />
                      ) : null}
                      {meeting.conferencing_details?.platform ? (
                        <List.Item.Detail.Metadata.Label
                          title="Conference"
                          text={meeting.conferencing_details.platform}
                        />
                      ) : null}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  {isActive && hasVideo ? (
                    <Action
                      title="Join Video Call"
                      icon={{ source: Icon.Video, tintColor: Color.Green }}
                      onAction={() => open(meeting.conferencing_details!.join_url!)}
                    />
                  ) : (
                    <Action
                      title="Open in Nocal"
                      onAction={() =>
                        openNocalDeepLink(
                          `event?id=${encodeURIComponent(meeting.id)}&calendar=${encodeURIComponent(meeting.calendar)}`,
                        )
                      }
                    />
                  )}
                  {!isActive && hasVideo ? (
                    <Action
                      title="Join Video Call"
                      icon={Icon.Video}
                      onAction={() => open(meeting.conferencing_details!.join_url!)}
                      shortcut={{ modifiers: ["shift"], key: "enter" }}
                    />
                  ) : null}
                  {isActive ? (
                    <Action
                      title="Open in Nocal"
                      onAction={() =>
                        openNocalDeepLink(
                          `event?id=${encodeURIComponent(meeting.id)}&calendar=${encodeURIComponent(meeting.calendar)}`,
                        )
                      }
                    />
                  ) : null}
                  <Action
                    title="Open Meeting Note"
                    onAction={() =>
                      openNocalDeepLink(
                        `event-note?id=${encodeURIComponent(meeting.id)}&calendar=${encodeURIComponent(meeting.calendar)}`,
                      )
                    }
                  />
                  <Action title="Refresh" onAction={() => void loadMeetings()} />
                </ActionPanel>
              }
            />
          );
        })(),
      )}
    </List>
  );
}
