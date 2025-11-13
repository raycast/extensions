import { List, ActionPanel, Action, Icon, Detail, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useMemo } from "react";
import type { Meeting } from "./types/Types";
import { getMeetingSummary, getMeetingTranscript, listTeams } from "./fathom/api";
import { MeetingDetailActions } from "./actions/MeetingActions";
import { useCachedMeetings } from "./hooks/useCachedMeetings";
import { getUserFriendlyError } from "./utils/errorHandling";
import { MeetingListItem } from "./components/MeetingListItem";
import { RefreshCacheAction } from "./actions/RefreshCacheAction";
import { getDateRanges } from "./utils/dates";

export default function Command() {
  const [filterType, setFilterType] = useState<string>("all");
  const [searchText, setSearchText] = useState<string>("");

  const ranges = getDateRanges();

  // Fetch teams for dropdown
  const { data: teamsData } = useCachedPromise(async () => listTeams({}), [], {
    keepPreviousData: true,
    initialData: { items: [], nextCursor: undefined },
  });

  const teams = teamsData?.items ?? [];

  // Get display name for current filter
  const filterDisplayName = useMemo(() => {
    if (filterType === "all") return null;
    if (filterType.startsWith("team:")) {
      return filterType.replace("team:", "");
    }
    return null;
  }, [filterType]);

  // Use cached meetings with full-text search
  const {
    meetings: cachedMeetings,
    isLoading,
    error,
    searchMeetings,
    refreshCache,
  } = useCachedMeetings({
    filter: {},
    enableCache: true,
  });

  // Filter and search meetings
  const { thisWeekMeetings, lastWeekMeetings, previousMonthMeetings, allFilteredMeetings } = useMemo(() => {
    // Apply full-text search first
    let allMeetings = searchText ? searchMeetings(searchText) : cachedMeetings;

    // Then apply team filter
    if (filterType.startsWith("team:")) {
      const teamName = filterType.replace("team:", "");
      allMeetings = allMeetings.filter(
        (meeting) => meeting.recordedByTeam === teamName || meeting.teamName === teamName,
      );
    }

    // Apply date filter for "all" view (for DISPLAY only, not for caching)
    if (filterType === "all") {
      allMeetings = allMeetings.filter((meeting) => {
        const meetingDate = new Date(meeting.createdAt || meeting.startTimeISO);
        const meetingTime = meetingDate.getTime();
        return meetingTime >= ranges.previousMonth.start.getTime() && meetingTime <= ranges.thisWeek.end.getTime();
      });
    }

    // If filtering is active, return all meetings sorted by date (newest first)
    if (filterType !== "all") {
      const sorted = [...allMeetings].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.startTimeISO).getTime();
        const dateB = new Date(b.createdAt || b.startTimeISO).getTime();
        return dateB - dateA; // Descending (newest first)
      });
      return {
        thisWeekMeetings: [],
        lastWeekMeetings: [],
        previousMonthMeetings: [],
        allFilteredMeetings: sorted,
      };
    }

    // No filter: group by date ranges
    const thisWeek: Meeting[] = [];
    const lastWeek: Meeting[] = [];
    const previousMonth: Meeting[] = [];

    allMeetings.forEach((meeting) => {
      const meetingDate = new Date(meeting.createdAt || meeting.startTimeISO);
      const meetingTime = meetingDate.getTime();

      if (meetingTime >= ranges.thisWeek.start.getTime() && meetingTime <= ranges.thisWeek.end.getTime()) {
        thisWeek.push(meeting);
      } else if (meetingTime >= ranges.lastWeek.start.getTime() && meetingTime <= ranges.lastWeek.end.getTime()) {
        lastWeek.push(meeting);
      } else if (
        meetingTime >= ranges.previousMonth.start.getTime() &&
        meetingTime <= ranges.previousMonth.end.getTime()
      ) {
        previousMonth.push(meeting);
      }
    });

    // Sort each group by date (newest first)
    const sortByDate = (a: Meeting, b: Meeting) => {
      const dateA = new Date(a.createdAt || a.startTimeISO).getTime();
      const dateB = new Date(b.createdAt || b.startTimeISO).getTime();
      return dateB - dateA; // Descending (newest first)
    };

    thisWeek.sort(sortByDate);
    lastWeek.sort(sortByDate);
    previousMonth.sort(sortByDate);

    return {
      thisWeekMeetings: thisWeek,
      lastWeekMeetings: lastWeek,
      previousMonthMeetings: previousMonth,
      allFilteredMeetings: [],
    };
  }, [cachedMeetings, searchMeetings, searchText, filterType, ranges]);

  const totalMeetings =
    filterType === "all"
      ? thisWeekMeetings.length + lastWeekMeetings.length + previousMonthMeetings.length
      : allFilteredMeetings.length;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search meetings by title, summary, or transcript..."
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle={filterDisplayName ? `Meetings: ${filterDisplayName}` : "Search Meetings"}
      actions={
        <ActionPanel>
          <RefreshCacheAction onRefresh={refreshCache} />
        </ActionPanel>
      }
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Team" value={filterType} onChange={setFilterType}>
          <List.Dropdown.Item title="All Meetings" value="all" />

          {teams.length > 0 && (
            <List.Dropdown.Section title="Teams">
              {teams.map((team) => (
                <List.Dropdown.Item
                  key={`team:${team.id}`}
                  title={team.name}
                  value={`team:${team.name}`}
                  icon={Icon.PersonLines}
                />
              ))}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={
            error instanceof Error && error.message.includes("Rate limit")
              ? "Rate Limit Exceeded"
              : "Failed to Load Meetings"
          }
          description={
            error instanceof Error && error.message.includes("Rate limit")
              ? "You've made too many requests. Please wait a moment and try again."
              : error instanceof Error
                ? error.message
                : String(error)
          }
          actions={
            <ActionPanel>
              <Action title="Refresh Cache" icon={Icon.ArrowClockwise} onAction={refreshCache} />
            </ActionPanel>
          }
        />
      ) : totalMeetings === 0 ? (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No Meetings Found"
          description={
            filterDisplayName
              ? `No meetings found for ${filterDisplayName}`
              : searchText
                ? "No meetings match your search"
                : "Your recent meetings will appear here"
          }
          actions={
            <ActionPanel>
              <Action title="Refresh Cache" icon={Icon.ArrowClockwise} onAction={refreshCache} />
            </ActionPanel>
          }
        />
      ) : filterType === "all" ? (
        // Grouped view (no filter)
        <>
          {thisWeekMeetings.length > 0 && (
            <List.Section title="This Week" subtitle={`${thisWeekMeetings.length} meetings`}>
              {thisWeekMeetings.map((meeting) => (
                <MeetingListItem key={meeting.id} meeting={meeting} onRefresh={refreshCache} />
              ))}
            </List.Section>
          )}

          {lastWeekMeetings.length > 0 && (
            <List.Section title="Last Week" subtitle={`${lastWeekMeetings.length} meetings`}>
              {lastWeekMeetings.map((meeting) => (
                <MeetingListItem key={meeting.id} meeting={meeting} onRefresh={refreshCache} />
              ))}
            </List.Section>
          )}

          {previousMonthMeetings.length > 0 && (
            <List.Section title="Previous Month" subtitle={`${previousMonthMeetings.length} meetings`}>
              {previousMonthMeetings.map((meeting) => (
                <MeetingListItem key={meeting.id} meeting={meeting} onRefresh={refreshCache} />
              ))}
            </List.Section>
          )}
        </>
      ) : (
        // Flat chronological list (when filtered)
        <List.Section title={filterDisplayName || "Filtered Meetings"} subtitle={`${totalMeetings} meetings`}>
          {allFilteredMeetings.map((meeting) => (
            <MeetingListItem key={meeting.id} meeting={meeting} onRefresh={refreshCache} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

// Summary Detail View
export function MeetingSummaryDetail({ meeting, recordingId }: { meeting: Meeting; recordingId: string }) {
  const {
    data: summary,
    isLoading,
    error,
  } = useCachedPromise(async (id: string) => getMeetingSummary(id), [recordingId], {
    onError: (err) => {
      const { message } = getUserFriendlyError(err);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Summary",
        message: message,
      });
    },
  });

  // Build markdown without action items (they have their own dedicated view now)
  const markdown = error
    ? `# Error\n\n${error instanceof Error ? error.message : String(error)}`
    : isLoading
      ? "Loading summary..."
      : `# ${meeting.meetingTitle || meeting.title}\n\n${summary?.text || "No summary available"}`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={meeting.title}
      isLoading={isLoading}
      actions={
        <MeetingDetailActions
          meeting={meeting}
          recordingId={recordingId}
          currentView="summary"
          additionalContent={{
            title: "Copy Summary",
            content: summary?.text || "",
            shortcut: { modifiers: ["cmd"], key: "c" },
          }}
        />
      }
      metadata={
        <Detail.Metadata>
          {meeting.createdAt && (
            <Detail.Metadata.Label
              title="Date"
              text={new Date(meeting.createdAt).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            />
          )}
          {meeting.durationSeconds && (
            <Detail.Metadata.Label title="Duration" text={`${Math.round(meeting.durationSeconds / 60)} minutes`} />
          )}
          {meeting.actionItemsCount !== undefined && meeting.actionItemsCount > 0 && (
            <Detail.Metadata.Label title="Action Items" text={String(meeting.actionItemsCount)} />
          )}
          {meeting.recordedByTeam && <Detail.Metadata.Label title="Team" text={meeting.recordedByTeam} />}
          {meeting.recordedByName && <Detail.Metadata.Label title="Recorded By" text={meeting.recordedByName} />}
        </Detail.Metadata>
      }
    />
  );
}

// Transcript Detail View
export function MeetingTranscriptDetail({ meeting, recordingId }: { meeting: Meeting; recordingId: string }) {
  const {
    data: transcript,
    isLoading,
    error,
  } = useCachedPromise(async (id: string) => getMeetingTranscript(id), [recordingId], {
    onError: (err) => {
      const { message } = getUserFriendlyError(err);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Transcript",
        message: message,
      });
    },
  });

  const markdown = error
    ? `# Error\n\n${error instanceof Error ? error.message : String(error)}`
    : isLoading
      ? "Loading transcript..."
      : transcript?.text || "No transcript available";

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${meeting.title} - Transcript`}
      isLoading={isLoading}
      actions={
        <MeetingDetailActions
          meeting={meeting}
          recordingId={recordingId}
          currentView="transcript"
          additionalContent={{
            title: "Copy Transcript",
            content: transcript?.text || "",
            shortcut: { modifiers: ["cmd"], key: "c" },
          }}
        />
      }
    />
  );
}
