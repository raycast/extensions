import { getMeetingSummary, getMeetingTranscript, listMeetings } from "../fathom/api";
import { getCachedMeeting, cacheMeeting } from "../utils/cache";
import type { Meeting } from "../types/Types";
import { logger } from "@chrismessina/raycast-logger";

type Input = {
  /**
   * Meeting ID to retrieve details for. If not provided, use title or other filters to find the meeting.
   */
  meetingId?: string;
  /**
   * Whether to include the full transcript in the response
   */
  includeTranscript: boolean;
  /**
   * Filter by meeting title or topic (used if meetingId is not provided)
   */
  title?: string;
  /**
   * Maximum number of meetings to search (when using title filter)
   */
  limit?: number;
};

/**
 * Retrieve detailed information about a specific Fathom meeting
 *
 * Returns comprehensive meeting details including summary, optional transcript,
 * action items, participants, and duration. Uses cache for performance optimization.
 * If meetingId is not provided, searches by title to find the most recent matching meeting.
 */
export default async function tool(input: Input) {
  try {
    let meetingId = input.meetingId;

    // If no meetingId provided, search by title
    if (!meetingId && input.title) {
      const searchFilter: { cursor?: string } = {};
      const result = await listMeetings(searchFilter);

      const titleLower = input.title.toLowerCase();
      const matchingMeeting = result.items.find((meeting) => {
        const title = (meeting.title || "").toLowerCase();
        const meetingTitle = (meeting.meetingTitle || "").toLowerCase();
        return title.includes(titleLower) || meetingTitle.includes(titleLower);
      });

      if (!matchingMeeting) {
        throw new Error(`No meeting found with title containing "${input.title}"`);
      }

      meetingId = matchingMeeting.id;
    }

    if (!meetingId) {
      throw new Error("Either meetingId or title must be provided");
    }

    // Try to get from cache first
    const cached = await getCachedMeeting(meetingId);

    let meeting: Meeting;
    let summary: string | undefined;
    let transcript: string | undefined;

    if (cached) {
      meeting = cached.meeting as Meeting;
      summary = cached.summary;
      transcript = input.includeTranscript ? cached.transcript : undefined;

      // If transcript is requested but not in cache, fetch it
      if (input.includeTranscript && !cached.transcript) {
        const transcriptResult = await getMeetingTranscript(meetingId);
        transcript = transcriptResult.text;

        // Update cache with transcript
        await cacheMeeting(meetingId, meeting, summary, transcript, cached.actionItems);
      }
    } else {
      // Fetch from API if not in cache
      const meetingsResult = await listMeetings({});
      const foundMeeting = meetingsResult.items.find((m) => m.id === meetingId);

      if (!foundMeeting) {
        throw new Error(`Meeting with ID ${meetingId} not found`);
      }

      meeting = foundMeeting;

      // Fetch summary
      try {
        const summaryResult = await getMeetingSummary(meetingId);
        summary = summaryResult.text;
      } catch (error) {
        logger.warn("Could not fetch summary:", error);
      }

      // Fetch transcript if requested
      if (input.includeTranscript) {
        try {
          const transcriptResult = await getMeetingTranscript(meetingId);
          transcript = transcriptResult.text;
        } catch (error) {
          logger.warn("Could not fetch transcript:", error);
        }
      }

      // Cache the meeting data
      await cacheMeeting(meetingId, meeting, summary, transcript, meeting.actionItems);
    }

    // Format response
    const response: Record<string, unknown> = {
      id: meeting.id,
      title: meeting.title,
      meetingTitle: meeting.meetingTitle,
      startTimeISO: meeting.startTimeISO,
      recordingEndTime: meeting.recordingEndTime,
      durationSeconds: meeting.durationSeconds,
      durationMinutes: meeting.durationSeconds ? Math.round(meeting.durationSeconds / 60) : undefined,
      calendarInvitees: meeting.calendarInvitees,
      calendarInviteesDomains: meeting.calendarInviteesDomains,
      recordedByName: meeting.recordedByName,
      recordedByUserId: meeting.recordedByUserId,
      recordedByTeam: meeting.recordedByTeam,
      isExternal: meeting.isExternal,
      transcriptLanguage: meeting.transcriptLanguage,
      url: meeting.url,
      shareUrl: meeting.shareUrl,
      summaryText: summary,
      actionItems: meeting.actionItems?.map((item) => ({
        description: item.description,
        assignee: item.assignee,
        completed: item.completed,
        userGenerated: item.userGenerated,
        recordingTimestamp: item.recordingTimestamp,
      })),
      actionItemsCount: meeting.actionItemsCount,
    };

    if (input.includeTranscript && transcript) {
      response.transcriptText = transcript;
    }

    return response;
  } catch (error) {
    logger.error("Error getting meeting details:", error);
    throw new Error(`Failed to get meeting details: ${error instanceof Error ? error.message : String(error)}`);
  }
}
