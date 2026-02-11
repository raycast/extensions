import { listMeetings } from "../fathom/api";
import { searchCachedMeetings, getAllCachedMeetings } from "../utils/cache";
import type { Meeting } from "../types/Types";
import { logger } from "@chrismessina/raycast-logger";

type Input = {
  /**
   * Maximum number of meetings to return
   */
  limit?: number;
  /**
   * Sort order for meetings (default: date)
   */
  sortBy?: "date" | "title";
  /**
   * Full-text search query across meeting titles, summaries, and transcripts
   */
  query?: string;
  /**
   * Filter by participant name or email
   */
  participant?: string;
  /**
   * Filter by meeting title or topic
   */
  title?: string;
  /**
   * Filter by meeting type
   */
  meetingType?: "all" | "internal" | "external";
  /**
   * Filter by date range
   */
  dateRange?: {
    start: string; // ISO 8601 date string
    end: string; // ISO 8601 date string
  };
  /**
   * Pagination cursor for fetching next page
   */
  cursor?: string;
};

/**
 * Search and list Fathom meetings with optional filters
 *
 * This tool retrieves meetings from cache for better performance when possible,
 * and falls back to the API when needed. Supports full-text search across titles,
 * summaries, and transcripts, plus filtering by participants, date ranges, topics,
 * and meeting types.
 */
export default async function tool(input: Input = {}) {
  try {
    // First, try to use cached meetings for better performance
    const cachedMeetings = await getAllCachedMeetings();

    // Apply full-text search if query is provided
    const filteredCached = input.query ? searchCachedMeetings(cachedMeetings, input.query) : cachedMeetings;

    let meetings: Meeting[] = filteredCached.map((cached) => cached.meeting as Meeting);

    // Apply filters
    if (input.participant) {
      const participantLower = input.participant.toLowerCase();
      meetings = meetings.filter((meeting) => {
        const invitees = meeting.calendarInvitees?.join(" ").toLowerCase() || "";
        const recordedBy = (meeting.recordedByName || "").toLowerCase();
        return invitees.includes(participantLower) || recordedBy.includes(participantLower);
      });
    }

    if (input.title) {
      const titleLower = input.title.toLowerCase();
      meetings = meetings.filter((meeting) => {
        const title = (meeting.title || "").toLowerCase();
        const meetingTitle = (meeting.meetingTitle || "").toLowerCase();
        return title.includes(titleLower) || meetingTitle.includes(titleLower);
      });
    }

    if (input.meetingType && input.meetingType !== "all") {
      meetings = meetings.filter((meeting) => {
        if (input.meetingType === "external") {
          return meeting.isExternal === true;
        } else if (input.meetingType === "internal") {
          return meeting.isExternal === false;
        }
        return true;
      });
    }

    if (input.dateRange) {
      const startTime = new Date(input.dateRange.start).getTime();
      const endTime = new Date(input.dateRange.end).getTime();
      meetings = meetings.filter((meeting) => {
        const meetingTime = new Date(meeting.createdAt || meeting.startTimeISO).getTime();
        return meetingTime >= startTime && meetingTime <= endTime;
      });
    }

    // Sort meetings
    meetings.sort((a, b) => {
      if (input.sortBy === "title") {
        return (a.title || "").localeCompare(b.title || "");
      }
      // Default: sort by date (newest first)
      const dateA = new Date(a.createdAt || a.startTimeISO).getTime();
      const dateB = new Date(b.createdAt || b.startTimeISO).getTime();
      return dateB - dateA;
    });

    // Apply limit
    if (input.limit) {
      meetings = meetings.slice(0, input.limit);
    }

    // If no cached results or need fresh data, fetch from API
    if (meetings.length === 0 && !input.cursor) {
      const apiFilter: {
        cursor?: string;
        calendarInvitees?: string[];
        meetingType?: "all" | "internal" | "external";
      } = {};

      if (input.cursor) {
        apiFilter.cursor = input.cursor;
      }

      if (input.participant) {
        apiFilter.calendarInvitees = [input.participant];
      }

      if (input.meetingType) {
        apiFilter.meetingType = input.meetingType;
      }

      const result = await listMeetings(apiFilter);
      meetings = result.items;

      // Apply client-side filters that API doesn't support
      if (input.title) {
        const titleLower = input.title.toLowerCase();
        meetings = meetings.filter((meeting) => {
          const title = (meeting.title || "").toLowerCase();
          const meetingTitle = (meeting.meetingTitle || "").toLowerCase();
          return title.includes(titleLower) || meetingTitle.includes(titleLower);
        });
      }

      if (input.dateRange) {
        const startTime = new Date(input.dateRange.start).getTime();
        const endTime = new Date(input.dateRange.end).getTime();
        meetings = meetings.filter((meeting) => {
          const meetingTime = new Date(meeting.createdAt || meeting.startTimeISO).getTime();
          return meetingTime >= startTime && meetingTime <= endTime;
        });
      }

      // Apply limit
      if (input.limit) {
        meetings = meetings.slice(0, input.limit);
      }
    }

    // Format response
    return meetings.map((meeting) => ({
      id: meeting.id,
      title: meeting.title,
      meetingTitle: meeting.meetingTitle,
      startTimeISO: meeting.startTimeISO,
      durationSeconds: meeting.durationSeconds,
      calendarInvitees: meeting.calendarInvitees,
      recordedByName: meeting.recordedByName,
      actionItemsCount: meeting.actionItemsCount,
      isExternal: meeting.isExternal,
      url: meeting.url,
    }));
  } catch (error) {
    logger.error("Error listing meetings:", error);
    throw new Error(`Failed to list meetings: ${error instanceof Error ? error.message : String(error)}`);
  }
}
