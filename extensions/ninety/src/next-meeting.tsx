import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getNextMeeting } from "./api/ninety";
import { NextMeeting } from "./api/types";
import { ErrorView } from "./components/ErrorView";
import { useTeams } from "./hooks/useTeams";
import { showError } from "./lib/errors";
import { formatDateTime, formatDuration, meetingTypeTitle, personName } from "./lib/format";
import { NinetyUrls } from "./lib/urls";

const CADENCE: Record<NextMeeting["cadence"], string> = {
  none: "One-time",
  weekly: "Weekly",
  biWeekly: "Every two weeks",
  monthly: "Monthly",
};

function meetingMarkdown(meeting: NextMeeting) {
  const agenda = [...meeting.agenda].sort((a, b) => a.ordinal - b.ordinal);
  const total = agenda.reduce((sum, item) => sum + item.durationSeconds, 0);
  const lines = [
    `# ${meeting.agendaName || meetingTypeTitle(meeting.meetingType)}`,
    `**${formatDateTime(meeting.scheduledDate)}**`,
  ];
  if (agenda.length) {
    lines.push(`### Agenda · ${formatDuration(total)}`);
    lines.push(agenda.map((item, i) => `${i + 1}. ${item.name} — ${formatDuration(item.durationSeconds)}`).join("\n"));
  }
  return lines.join("\n\n");
}

function agendaText(meeting: NextMeeting) {
  return [...meeting.agenda]
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((item) => `${item.name} (${formatDuration(item.durationSeconds)})`)
    .join("\n");
}

function MeetingDetail({ meeting, isLoading, error }: MeetingState) {
  if (error && !meeting) {
    return (
      <List.Item.Detail markdown={`## Couldn't load the next Meeting\n\n${error.message}\n\nPress ⌘R to try again.`} />
    );
  }
  if (isLoading && meeting === undefined) return <List.Item.Detail isLoading />;
  if (!meeting)
    return (
      <List.Item.Detail markdown={"## Nothing scheduled soon\n\nThis Team has no Meeting in the next few weeks."} />
    );

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={meetingMarkdown(meeting)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Type" text={meetingTypeTitle(meeting.meetingType)} />
          <List.Item.Detail.Metadata.Label title="Repeats" text={CADENCE[meeting.cadence] ?? meeting.cadence} />
          {meeting.presenter ? (
            <List.Item.Detail.Metadata.Label title="Presenter" text={personName(meeting.presenter)} />
          ) : null}
          {meeting.scribe ? <List.Item.Detail.Metadata.Label title="Scribe" text={personName(meeting.scribe)} /> : null}
          {meeting.attendees.length ? (
            <List.Item.Detail.Metadata.TagList title={`Attendees (${meeting.attendees.length})`}>
              {meeting.attendees.map((person) => (
                <List.Item.Detail.Metadata.TagList.Item key={person.id} text={personName(person) || "Unknown"} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

interface MeetingState {
  meeting?: NextMeeting | null;
  isLoading: boolean;
  error?: Error;
}

function MeetingActions({ meeting, onRefresh }: { meeting?: NextMeeting | null; onRefresh: () => void }) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser title="Open Meetings in Ninety" url={NinetyUrls.meetings} />
      {meeting ? (
        <>
          <Action.CopyToClipboard
            title="Copy Agenda"
            content={agendaText(meeting)}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard
            title="Copy Date and Time"
            content={formatDateTime(meeting.scheduledDate)}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "d" },
              Windows: { modifiers: ["ctrl", "shift"], key: "d" },
            }}
          />
        </>
      ) : null}
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onRefresh}
      />
    </ActionPanel>
  );
}

export default function Command() {
  const { teams, isLoading: isLoadingTeams, error: teamsError, revalidate: retryTeams } = useTeams();
  const [selected, setSelected] = useState<string | null>(null);
  const memberTeams = teams.filter((team) => team.isMember);
  const shown = memberTeams.length ? memberTeams : teams;

  const {
    data: meeting,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(getNextMeeting, [selected ?? ""], {
    execute: !!selected,
    onError: (error) => {
      showError(error, "Couldn't load the next Meeting");
    },
  });

  return (
    <List
      isLoading={isLoadingTeams}
      isShowingDetail={shown.length > 0}
      searchBarPlaceholder="Filter Teams"
      onSelectionChange={setSelected}
    >
      {teamsError ? (
        <ErrorView title="Couldn't load Teams" error={teamsError} onRetry={() => retryTeams()} />
      ) : (
        <List.EmptyView icon={Icon.Calendar} title="No Teams found" />
      )}
      {shown.map((team) => {
        const isSelected = selected === team._id;
        return (
          <List.Item
            key={team._id}
            id={team._id}
            title={team.name}
            icon={Icon.TwoPeople}
            detail={
              isSelected ? (
                <MeetingDetail meeting={meeting} isLoading={isLoading} error={error} />
              ) : (
                <List.Item.Detail isLoading />
              )
            }
            actions={<MeetingActions meeting={isSelected ? meeting : undefined} onRefresh={() => revalidate()} />}
          />
        );
      })}
    </List>
  );
}
