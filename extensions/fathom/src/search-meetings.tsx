import { List, ActionPanel, Action, Icon, Detail, showToast, Toast, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useMemo, useCallback } from "react";
import type { Meeting, Team } from "./types/Types";
import { getMeetingSummary, getMeetingTranscript, listTeams } from "./fathom/api";
import { MeetingDetailActions } from "./actions/MeetingActions";
import { useCachedMeetings } from "./hooks/useCachedMeetings";
import { getUserFriendlyError, classifyError, ErrorType } from "./utils/errorHandling";
import { hasApiKey, isApiKeyKnownInvalid } from "./fathom/auth";

import { MeetingListItem } from "./components/MeetingListItem";
import { RefreshCacheAction } from "./actions/RefreshCacheAction";
import { getDateRanges } from "./utils/dates";

function getErrorDisplay(error: Error): { icon: Icon; title: string; description: string; isAuth: boolean } {
  const errorType = classifyError(error);

  switch (errorType) {
    case ErrorType.API_KEY_MISSING:
      return {
        icon: Icon.Key,
        title: "API Key Required",
        description: "Please check your Fathom API Key in Extension Preferences.",
        isAuth: true,
      };
    case ErrorType.API_KEY_INVALID:
      return {
        icon: Icon.Key,
        title: "Invalid API Key",
        description: "Please check your Fathom API Key in Extension Preferences.",
        isAuth: true,
      };
    case ErrorType.RATE_LIMIT:
      return {
        icon: Icon.ExclamationMark,
        title: "Rate Limit Exceeded",
        description: "You've made too many requests. Please wait a moment and try again.",
        isAuth: false,
      };
    default:
      return {
        icon: Icon.ExclamationMark,
        title: "Failed to Load Meetings",
        description: getUserFriendlyError(error).message,
        isAuth: false,
      };
  }
}

function ErrorEmptyView(props: { error: Error; onRefresh: () => Promise<void> }) {
  const { icon, title, description, isAuth } = getErrorDisplay(props.error);

  return (
    <List.EmptyView
      icon={icon}
      title={title}
      description={description}
      actions={
        <ActionPanel>
          {isAuth && (
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          )}
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={props.onRefresh} />
        </ActionPanel>
      }
    />
  );
}

function Command() {
  const [filterType, setFilterType] = useState<string>("all");
  const [searchText, setSearchText] = useState<string>("");

  // Early API key check — if missing, skip all API calls and show error view
  const apiKeyPresent = hasApiKey();

  const ranges = getDateRanges();

  // Fetch teams for dropdown — wrapped so it never throws (returns empty on any error)
  const { data: teamsData } = useCachedPromise(
    async () => {
      try {
        return await listTeams({});
      } catch {
        return { items: [] as Team[], nextCursor: undefined };
      }
    },
    [],
    {
      keepPreviousData: true,
      initialData: { items: [] as Team[], nextCursor: undefined },
      execute: apiKeyPresent,
    },
  );

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
    isFetchingBackground,
    error: meetingsError,
    searchMeetings,
    refreshCache,
    stopFetch,
    loadMore,
    hasMore,
  } = useCachedMeetings({
    filter: {},
    enableCache: apiKeyPresent,
  });

  const loadMoreMeetings = useCallback(async () => {
    if (!apiKeyPresent) return;
    await loadMore();
  }, [apiKeyPresent, loadMore]);

  // Combine error sources: explicit missing key OR runtime API error
  const error: Error | undefined = !apiKeyPresent
    ? new Error("API_KEY_MISSING: No API key configured. Please set your Fathom API Key in Extension Preferences.")
    : isApiKeyKnownInvalid()
      ? new Error("API_KEY_INVALID: Invalid API Key. Please check your Fathom API Key in Extension Preferences.")
      : meetingsError;

  const sortByDate = (a: Meeting, b: Meeting) => {
    const getTime = (meeting: Meeting): number => {
      const dateStr = meeting.createdAt || meeting.startTimeISO;
      if (!dateStr) return 0;
      const time = new Date(dateStr).getTime();
      return isNaN(time) ? 0 : time;
    };

    const dateA = getTime(a);
    const dateB = getTime(b);
    return dateB - dateA; // Descending (newest first)
  };

  // Filter and search meetings
  const { thisWeekMeetings, lastWeekMeetings, previousMonthMeetings, olderMeetings, allFilteredMeetings } =
    useMemo(() => {
      // Apply full-text search first
      let allMeetings = searchText ? searchMeetings(searchText) : cachedMeetings;

      // Then apply team filter
      if (filterType.startsWith("team:")) {
        const teamName = filterType.replace("team:", "");
        allMeetings = allMeetings.filter(
          (meeting) => meeting.recordedByTeam === teamName || meeting.teamName === teamName,
        );
      }

      // If searching or team-filtering, return flat chronological list across ALL meetings
      if (searchText || filterType !== "all") {
        const sorted = [...allMeetings].sort(sortByDate);
        return {
          thisWeekMeetings: [],
          lastWeekMeetings: [],
          previousMonthMeetings: [],
          olderMeetings: [],
          allFilteredMeetings: sorted,
        };
      }

      // Default view: group by date ranges (no date restriction — shows everything)
      const thisWeek: Meeting[] = [];
      const lastWeek: Meeting[] = [];
      const previousMonth: Meeting[] = [];
      const older: Meeting[] = [];

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
        } else {
          older.push(meeting);
        }
      });

      thisWeek.sort(sortByDate);
      lastWeek.sort(sortByDate);
      previousMonth.sort(sortByDate);
      older.sort(sortByDate);

      return {
        thisWeekMeetings: thisWeek,
        lastWeekMeetings: lastWeek,
        previousMonthMeetings: previousMonth,
        olderMeetings: older,
        allFilteredMeetings: [],
      };
    }, [cachedMeetings, searchMeetings, searchText, filterType, ranges]);

  const totalMeetings =
    searchText || filterType !== "all"
      ? allFilteredMeetings.length
      : thisWeekMeetings.length + lastWeekMeetings.length + previousMonthMeetings.length + olderMeetings.length;

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
          <RefreshCacheAction onRefresh={refreshCache} onStop={stopFetch} isFetchingBackground={isFetchingBackground} />
        </ActionPanel>
      }
      pagination={apiKeyPresent && !error ? { pageSize: 20, hasMore, onLoadMore: loadMoreMeetings } : undefined}
      searchBarAccessory={
        teams.length > 0 ? (
          <List.Dropdown tooltip="Filter by Team" value={filterType} onChange={setFilterType}>
            <List.Dropdown.Item title="All Meetings" value="all" />
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
          </List.Dropdown>
        ) : undefined
      }
    >
      {error ? (
        <ErrorEmptyView error={error} onRefresh={refreshCache} />
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
      ) : allFilteredMeetings.length > 0 ? (
        // Flat chronological list (when searching or team-filtering)
        <List.Section
          title={searchText ? "Search Results" : filterDisplayName || "Filtered Meetings"}
          subtitle={`${totalMeetings} meetings`}
        >
          {allFilteredMeetings.map((meeting) => (
            <MeetingListItem key={meeting.id} meeting={meeting} onRefresh={refreshCache} />
          ))}
        </List.Section>
      ) : (
        // Grouped view (default browse)
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

          {olderMeetings.length > 0 && (
            <List.Section title="Older" subtitle={`${olderMeetings.length} meetings`}>
              {olderMeetings.map((meeting) => (
                <MeetingListItem key={meeting.id} meeting={meeting} onRefresh={refreshCache} />
              ))}
            </List.Section>
          )}
        </>
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
        message,
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
        message,
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

export default Command;
