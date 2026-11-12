import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getMeetingsOverview, getPastMeeting, meetingEndTime } from "./api/ninety";
import { MeetingItemRef, NextMeeting, PastMeeting } from "./api/types";
import { ErrorView } from "./components/ErrorView";
import { MY_ITEMS, TeamDropdown } from "./components/TeamDropdown";
import { useTeams } from "./hooks/useTeams";
import { useUsers } from "./hooks/useUsers";
import { showError } from "./lib/errors";
import { compact, formatDateTime, formatDuration, htmlToMarkdown, meetingTypeTitle, personName } from "./lib/format";
import { NinetyUrls } from "./lib/urls";
import { useAvatar } from "./hooks/useAvatar";

const CADENCE: Record<NextMeeting["cadence"], string> = {
  none: "One-time",
  weekly: "Weekly",
  biWeekly: "Every two weeks",
  monthly: "Monthly",
};

/** Past Meetings shown per view, newest first. */
const PAST_LIMIT = 25;

function agendaSeconds(meeting: NextMeeting) {
  return meeting.agenda.reduce((sum, item) => sum + item.durationSeconds, 0);
}

/**
 * Ninety's API doesn't expose Meetings in progress, so a Team's next Meeting counts as happening now
 * from its start time until its agenda's length (plus a grace period) has passed.
 */
/** Teams often join a little early, so a Meeting counts as happening now this long before it starts. */
const JOIN_EARLY_MS = 10 * 60 * 1000;

function isHappeningNow(meeting: NextMeeting, now = Date.now()) {
  return now >= new Date(meeting.scheduledDate).getTime() - JOIN_EARLY_MS && now <= meetingEndTime(meeting);
}

function meetingTitle(meeting: { meetingType: NextMeeting["meetingType"]; name?: string; agendaName?: string }) {
  return meeting.agendaName || meeting.name || meetingTypeTitle(meeting.meetingType);
}

function upcomingMarkdown(meeting: NextMeeting) {
  const agenda = [...meeting.agenda].sort((a, b) => a.ordinal - b.ordinal);
  const lines = [`## ${meetingTitle(meeting)}`, `**${formatDateTime(meeting.scheduledDate)}**`];
  if (agenda.length) {
    lines.push(`### Agenda · ${formatDuration(agendaSeconds(meeting))}`);
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

function itemList(title: string, items?: MeetingItemRef[]) {
  const named = (items ?? []).filter((item) => item.title);
  return named.length ? [`### ${title}`, named.map((item) => `- ${item.title}`).join("\n")] : [];
}

function solvedText(meeting: PastMeeting) {
  if (meeting.issuesSolved === undefined) return undefined;
  const rate = meeting.issueSolveRatePercent !== undefined ? ` (${meeting.issueSolveRatePercent}%)` : "";
  return `${meeting.issuesSolved} of ${meeting.issuesTracked ?? 0}${rate}`;
}

function PastMeetingDetail({ meeting, teamName }: { meeting: PastMeeting; teamName?: string }) {
  const { avatar } = useAvatar();
  const { userName } = useUsers();
  const { data, isLoading } = useCachedPromise(getPastMeeting, [meeting.id], { onError: () => undefined });
  const full = data ?? meeting;
  const notes = htmlToMarkdown(data?.notes);
  const markdown = [
    `## ${meetingTitle(meeting)}`,
    `**${formatDateTime(meeting.date)}**`,
    ...(notes ? ["### Notes", notes] : []),
    ...itemList("Issues Solved", data?.workedIssues),
    ...itemList("To-Dos Created", data?.newTodos),
    ...itemList("Rocks Created", data?.newRocks),
    ...itemList("Headlines", data?.doneHeadlines),
    ...itemList("Cascading Messages", data?.cascadingMessages),
  ].join("\n\n");
  const presenter = data?.presenter ? personName(data.presenter) : userName(meeting.presenterId);
  const solved = solvedText(full);

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Team" text={teamName ?? "—"} />
          <List.Item.Detail.Metadata.Label title="Type" text={meetingTypeTitle(meeting.meetingType)} />
          <List.Item.Detail.Metadata.Label
            title="Length"
            text={meeting.durationSeconds ? formatDuration(meeting.durationSeconds) : "Not recorded"}
          />
          {presenter ? (
            <List.Item.Detail.Metadata.Label
              title="Presenter"
              text={presenter}
              icon={avatar(presenter, data?.presenter?.id ?? meeting.presenterId)}
            />
          ) : null}
          <List.Item.Detail.Metadata.Label
            title="Average Rating"
            text={meeting.averageRating !== undefined ? `${meeting.averageRating} / 10` : "Not rated"}
          />
          {solved ? <List.Item.Detail.Metadata.Label title="Issues Solved" text={solved} /> : null}
          {data?.attendees?.length ? (
            <List.Item.Detail.Metadata.TagList title={`Roster (${data.attendees.length})`}>
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

function UpcomingDetail({ meeting, teamName }: { meeting: NextMeeting; teamName?: string }) {
  const { avatar } = useAvatar();
  return (
    <List.Item.Detail
      markdown={upcomingMarkdown(meeting)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Team" text={teamName ?? meeting.teamName ?? "—"} />
          <List.Item.Detail.Metadata.Label title="Type" text={meetingTypeTitle(meeting.meetingType)} />
          <List.Item.Detail.Metadata.Label title="Repeats" text={CADENCE[meeting.cadence] ?? meeting.cadence} />
          {meeting.presenter ? (
            <List.Item.Detail.Metadata.Label
              title="Presenter"
              text={personName(meeting.presenter)}
              icon={avatar(personName(meeting.presenter), meeting.presenter.id)}
            />
          ) : null}
          {meeting.scribe ? (
            <List.Item.Detail.Metadata.Label
              title="Scribe"
              text={personName(meeting.scribe)}
              icon={avatar(personName(meeting.scribe), meeting.scribe.id)}
            />
          ) : null}
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

export default function Command() {
  const { ownerAccessory } = useAvatar();
  const { teams, teamName, error: teamsError, revalidate: retryTeams } = useTeams();
  const { userName } = useUsers();
  const [scope, setScope] = useState("");
  const [showDetail, setShowDetail] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const memberTeams = teams.filter((team) => team.isMember);
  const teamIds = scope === MY_ITEMS ? (memberTeams.length ? memberTeams : teams).map((team) => team._id) : [scope];
  const showTeam = scope === MY_ITEMS;

  const { data, isLoading, error, revalidate } = useCachedPromise(getMeetingsOverview, [teamIds], {
    execute: !!scope && teamIds.length > 0 && !!teamIds[0],
    keepPreviousData: true,
    onError: (error) => {
      showError(error, "Couldn't load Meetings");
    },
  });

  const now = Date.now();
  const upcoming = data?.upcoming ?? [];
  const current = upcoming.filter((meeting) => isHappeningNow(meeting, now));
  const later = upcoming.filter((meeting) => !isHappeningNow(meeting, now));
  const past = (data?.past ?? []).slice(0, PAST_LIMIT);
  const hasItems = upcoming.length + past.length > 0;

  const toggleDetail = (
    <Action
      title={showDetail ? "Hide Details" : "Show Details"}
      icon={Icon.Sidebar}
      onAction={() => setShowDetail((v) => !v)}
    />
  );
  const refreshAction = (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={() => revalidate()}
    />
  );

  function upcomingItem(meeting: NextMeeting, live: boolean) {
    const id = `next-${meeting.teamId}`;
    const team = teamName(meeting.teamId) ?? meeting.teamName;
    const presenter = meeting.presenter ? personName(meeting.presenter) : undefined;
    return (
      <List.Item
        key={id}
        id={id}
        title={meetingTitle(meeting)}
        subtitle={showDetail || !showTeam ? undefined : team}
        icon={{ source: Icon.Calendar, tintColor: live ? Color.Green : Color.Blue }}
        keywords={compact([team, presenter])}
        accessories={
          showDetail
            ? undefined
            : compact<List.Item.Accessory>([
                live ? { tag: { value: "Happening Now", color: Color.Green } } : undefined,
                { date: new Date(meeting.scheduledDate), tooltip: formatDateTime(meeting.scheduledDate) },
                ownerAccessory(presenter, meeting.presenter?.id),
              ])
        }
        detail={<UpcomingDetail meeting={meeting} teamName={team} />}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              {toggleDetail}
              <Action.OpenInBrowser
                title="Open in Ninety"
                url={NinetyUrls.meetingsOfType(meeting.meetingType, meeting.teamId)}
              />
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
            </ActionPanel.Section>
            <ActionPanel.Section>{refreshAction}</ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  function pastItem(meeting: PastMeeting) {
    const id = `past-${meeting.id}`;
    const team = teamName(meeting.teamId);
    const presenter = userName(meeting.presenterId);
    return (
      <List.Item
        key={id}
        id={id}
        title={meetingTitle(meeting)}
        subtitle={showDetail || !showTeam ? undefined : team}
        icon={{ source: Icon.CheckCircle, tintColor: Color.SecondaryText }}
        keywords={compact([team, presenter])}
        accessories={
          showDetail
            ? undefined
            : compact<List.Item.Accessory>([
                meeting.issuesSolved !== undefined
                  ? {
                      icon: Icon.Bolt,
                      text: String(meeting.issuesSolved),
                      tooltip: `Issues solved: ${solvedText(meeting)}`,
                    }
                  : undefined,
                meeting.averageRating !== undefined
                  ? { icon: Icon.Star, text: String(meeting.averageRating), tooltip: "Average rating" }
                  : undefined,
                { date: new Date(meeting.date), tooltip: formatDateTime(meeting.date) },
                ownerAccessory(presenter, meeting.presenterId),
              ])
        }
        detail={
          showDetail && selectedId === id ? (
            <PastMeetingDetail meeting={meeting} teamName={team} />
          ) : (
            <List.Item.Detail />
          )
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              {toggleDetail}
              <Action.OpenInBrowser title="Open in Ninety" url={NinetyUrls.pastMeeting(meeting)} />
            </ActionPanel.Section>
            <ActionPanel.Section>{refreshAction}</ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading || (!scope && !teamsError)}
      isShowingDetail={showDetail && hasItems}
      searchBarPlaceholder="Filter Meetings"
      onSelectionChange={setSelectedId}
      searchBarAccessory={
        <TeamDropdown id="meetings-team" teams={teams} onChange={setScope} mineTitle="All My Teams" />
      }
    >
      {teamsError || error ? (
        <ErrorView
          title={teamsError ? "Couldn't load Teams" : "Couldn't load Meetings"}
          error={(teamsError ?? error)!}
          onRetry={() => (teamsError ? retryTeams() : revalidate())}
        />
      ) : (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No Meetings"
          description="Nothing scheduled soon and no past Meetings."
          actions={<ActionPanel>{refreshAction}</ActionPanel>}
        />
      )}
      <List.Section title="Happening Now">{current.map((meeting) => upcomingItem(meeting, true))}</List.Section>
      <List.Section title="Upcoming">{later.map((meeting) => upcomingItem(meeting, false))}</List.Section>
      <List.Section title="Past" subtitle={past.length ? String(past.length) : undefined}>
        {past.map(pastItem)}
      </List.Section>
    </List>
  );
}
