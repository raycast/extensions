import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getNextMeeting } from "./api/ninety";
import { NextMeeting } from "./api/types";
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

function MeetingDetail({ teamId }: { teamId: string }) {
  const { data, isLoading } = useCachedPromise(getNextMeeting, [teamId], {
    onError: (error) => {
      showError(error, "Couldn't load the next Meeting");
    },
  });

  if (isLoading && data === undefined) return <List.Item.Detail isLoading />;
  if (!data)
    return (
      <List.Item.Detail markdown={"## Nothing scheduled soon\n\nThis Team has no Meeting in the next few weeks."} />
    );

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={meetingMarkdown(data)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Type" text={meetingTypeTitle(data.meetingType)} />
          <List.Item.Detail.Metadata.Label title="Repeats" text={CADENCE[data.cadence] ?? data.cadence} />
          {data.presenter ? (
            <List.Item.Detail.Metadata.Label title="Presenter" text={personName(data.presenter)} />
          ) : null}
          {data.scribe ? <List.Item.Detail.Metadata.Label title="Scribe" text={personName(data.scribe)} /> : null}
          {data.attendees.length ? (
            <List.Item.Detail.Metadata.TagList title={`Attendees (${data.attendees.length})`}>
              {data.attendees.map((person) => (
                <List.Item.Detail.Metadata.TagList.Item key={person.id} text={personName(person) || "Unknown"} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function MeetingActions({ teamId, isSelected }: { teamId: string; isSelected: boolean }) {
  const { data } = useCachedPromise(getNextMeeting, [teamId], { execute: isSelected, onError: () => undefined });
  return (
    <ActionPanel>
      <Action.OpenInBrowser title="Open Meetings in Ninety" url={NinetyUrls.meetings} />
      {data ? (
        <>
          <Action.CopyToClipboard
            title="Copy Agenda"
            content={agendaText(data)}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard
            title="Copy Date and Time"
            content={formatDateTime(data.scheduledDate)}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </>
      ) : null}
    </ActionPanel>
  );
}

export default function Command() {
  const { teams, isLoading } = useTeams();
  const [selected, setSelected] = useState<string | null>(null);
  const memberTeams = teams.filter((team) => team.isMember);
  const shown = memberTeams.length ? memberTeams : teams;

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Filter Teams" onSelectionChange={setSelected}>
      <List.EmptyView icon={Icon.Calendar} title="No Teams found" />
      {shown.map((team) => (
        <List.Item
          key={team._id}
          id={team._id}
          title={team.name}
          icon={Icon.TwoPeople}
          detail={selected === team._id ? <MeetingDetail teamId={team._id} /> : <List.Item.Detail isLoading />}
          actions={<MeetingActions teamId={team._id} isSelected={selected === team._id} />}
        />
      ))}
    </List>
  );
}
