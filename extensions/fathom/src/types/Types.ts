// Centralized domain types for the Fathom Raycast extension.
// Aligned with the official Fathom API specification.
// https://developers.fathom.ai/api-reference

export type MeetingType = "all" | "internal" | "external";

export type CalendarInviteesDomainType = "all" | "only_internal" | "one_or_more_external";

export interface Meeting {
  // Core identifiers
  id: string; // Derived from recording_id
  recordingId: string; // API: recording_id (integer in API, stored as string)

  // Titles
  title: string; // API: title (Fathom's generated title)
  meetingTitle?: string; // API: meeting_title (calendar event title)

  // URLs
  url: string; // API: url (fathom.video URL)
  shareUrl?: string; // API: share_url

  // Timestamps
  createdAt?: string; // API: created_at (ISO 8601)
  scheduledStartTime?: string; // API: scheduled_start_time (ISO 8601)
  scheduledEndTime?: string; // API: scheduled_end_time (ISO 8601)
  startTimeISO: string; // API: recording_start_time (ISO 8601) - used for display
  recordingEndTime?: string; // API: recording_end_time (ISO 8601)
  durationSeconds?: number; // Calculated from start/end times

  // Meeting classification
  calendarInviteesDomainType?: CalendarInviteesDomainType; // API: calendar_invitees_domains_type
  isExternal?: boolean; // Derived from calendarInviteesDomainType
  transcriptLanguage?: string; // API: transcript_language

  // Participants
  calendarInvitees?: string[]; // Simplified: email addresses only
  calendarInviteesDomains?: string[]; // Derived from invitee emails
  recordedByUserId?: string; // API: recorded_by.email
  recordedByName?: string; // API: recorded_by.name
  recordedByTeam?: string | null; // API: recorded_by.team

  // Summary metadata
  actionItems?: ActionItem[]; // API: action_items (array of action item objects)
  actionItemsCount?: number; // Derived from actionItems.length

  // Optional embedded content for caching
  summaryText?: string;
  transcriptText?: string;

  // Legacy fields for backwards compatibility
  teamId?: string; // Not in current API
  teamName?: string | null; // Not in current API
}

export interface Recording {
  id: string;
  meetingId: string;
  title: string;
  startTimeISO: string;
  durationSeconds?: number;
  teamId?: string;
  teamName?: string | null;
  url?: string;
  ownerUserId?: string;
}

export interface Team {
  id: string; // Derived from name (API doesn't provide separate ID)
  name: string; // API: name (required)
  createdAt?: string; // API: created_at (ISO 8601)
  memberCount?: number; // Not provided by API, for future use
}

export interface TeamMember {
  id: string; // Derived from email
  name: string; // API: name (required)
  email: string; // API: email (required)
  emailDomain?: string; // Derived from email
  createdAt?: string; // API: created_at (ISO 8601)
  teamId?: string; // Not in current API
  team?: string | null; // Used when filtering by team
}

export interface Assignee {
  name: string | null; // API: assignee.name
  email: string | null; // API: assignee.email
  team: string | null; // API: assignee.team
}

export interface ActionItem {
  description: string; // API: description (always in English)
  userGenerated: boolean; // API: user_generated
  completed: boolean; // API: completed
  recordingTimestamp: string; // API: recording_timestamp (HH:MM:SS)
  recordingPlaybackUrl: string; // API: recording_playback_url
  assignee: Assignee; // API: assignee
}

export interface Summary {
  templateName?: string | null; // API: summary.template_name
  text: string; // API: summary.markdown_formatted (always in English)
}

export interface TranscriptSegment {
  // API returns timestamp as HH:MM:SS, we convert to seconds for easier handling
  startSeconds: number; // Derived from API: transcript[].timestamp
  endSeconds: number; // Calculated (next segment start or meeting end)
  speaker?: string; // API: transcript[].speaker.display_name
  speakerEmail?: string | null; // API: transcript[].speaker.matched_calendar_invitee_email
  text: string; // API: transcript[].text
  timestamp?: string; // Original API format: "HH:MM:SS"
}

export interface Transcript {
  text: string; // Full transcript text (derived from segments)
  segments?: TranscriptSegment[]; // API: transcript[] array
}

export interface MeetingFilter {
  // Pagination
  cursor?: string; // API: cursor

  // Filtering by participants
  calendarInvitees?: string[]; // API: calendar_invitees[] (email addresses)
  calendarInviteesDomains?: string[]; // API: calendar_invitees_domains[] (domain strings)
  calendarInviteesDomainType?: CalendarInviteesDomainType; // API: calendar_invitees_domains_type

  // Filtering by time
  createdAfter?: string; // API: created_after (ISO 8601 timestamp)
  createdBefore?: string; // API: created_before (ISO 8601 timestamp)

  // Filtering by type and ownership
  meetingType?: MeetingType; // API: meeting_type (deprecated in API)
  recordedBy?: string[]; // API: recorded_by[] (email addresses)
  teams?: string[]; // API: teams[] (team names)

  // Include additional data
  includeCrmMatches?: boolean; // API: include_crm_matches
  includeSummary?: boolean; // API: include_summary (OAuth apps: use /recordings instead)
  includeTranscript?: boolean; // API: include_transcript (OAuth apps: use /recordings instead)

  // Legacy/UI fields
  query?: string; // For local filtering (not sent to API)
  pageSize?: number; // Not used by API (API controls pagination)
}

export interface Paginated<T> {
  items: T[];
  nextCursor?: string;
}

export interface UIListItem {
  id: string;
  title: string;
  subtitle?: string;
  accessories?: { text?: string; tag?: string }[];
  icon?: { source: string } | { source: string; tintColor?: string } | undefined;
  url?: string;
  meta?: Record<string, unknown>;
}
