import type { MeetingFilter, Paginated, Meeting, Summary, Transcript, Team, TeamMember } from "../types/Types";
import { getFathomClient, getApiKey } from "./client";
import { isNumber, toStringOrUndefined } from "../utils/typeGuards";
import { convertSDKMeeting, convertSDKTeam, convertSDKTeamMember } from "../utils/converters";
import { formatTranscriptToMarkdown } from "../utils/formatting";
import { parseTimestamp } from "../utils/dates";
import { logger } from "@chrismessina/raycast-logger";

const BASE = "https://api.fathom.ai/external/v1";

// Rate limit configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 10000; // 10 seconds

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with jitter
 */
function getRetryDelay(attempt: number): number {
  const exponentialDelay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt), MAX_RETRY_DELAY);
  // Add jitter (±25%) to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
  return Math.floor(exponentialDelay + jitter);
}

// Fetch helpers
async function authGet<T>(path: string, retryCount = 0): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("API_KEY_MISSING: Fathom API Key is not set. Please configure it in Extension Preferences.");
  }

  // Log every API call with stack trace to identify caller
  const caller = new Error().stack?.split("\n")[2]?.trim() || "unknown";
  logger.log(`[API] 🌐 HTTP GET ${path} (attempt ${retryCount + 1}/${MAX_RETRIES + 1}) - Called from: ${caller}`);

  const res = await fetch(`${BASE}${path}`, {
    method: "GET",
    headers: {
      "X-Api-Key": apiKey,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("API_KEY_INVALID: Invalid API Key. Please check your Fathom API Key in Extension Preferences.");
    }

    // Handle rate limiting with exponential backoff
    if (res.status === 429) {
      if (retryCount < MAX_RETRIES) {
        const retryDelay = getRetryDelay(retryCount);
        logger.warn(
          `[API] ⚠️  RATE LIMITED on ${path} - Retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})\n` +
            `      Called from: ${caller}`,
        );
        await sleep(retryDelay);
        return authGet<T>(path, retryCount + 1);
      }
      // After max retries, throw a more informative error
      logger.error(`[API] ❌ RATE LIMIT EXCEEDED on ${path} after ${MAX_RETRIES} retries`);
      throw new Error(
        "RATE_LIMIT: Rate limit exceeded after multiple retries. The Fathom API is temporarily unavailable. Please try again in a few moments.",
      );
    }

    // Handle other HTTP errors with user-friendly messages
    if (res.status === 404) {
      throw new Error(`NOT_FOUND: The requested resource was not found.`);
    }
    if (res.status === 403) {
      throw new Error(`PERMISSION: You don't have permission to access this resource.`);
    }
    if (res.status >= 500) {
      throw new Error(`NETWORK: Fathom service is temporarily unavailable. Please try again later.`);
    }
    throw new Error(`NETWORK: Unable to connect to Fathom (HTTP ${res.status}).`);
  }

  const data = (await res.json()) as unknown;
  logger.log(`[API] ✅ Success ${path}`);
  return data as T;
}

// API functions
export async function listMeetings(filter: MeetingFilter): Promise<Paginated<Meeting>> {
  logger.log(`[API] 📋 listMeetings called with filter:`, filter);
  logger.log(`[API] 🔵 Calling Fathom SDK client.listMeetings()...`);
  try {
    const client = getFathomClient();

    const result = await client.listMeetings({
      cursor: filter.cursor,
      calendarInvitees: filter.calendarInvitees,
      calendarInviteesDomains: filter.calendarInviteesDomains,
    });

    const items: Meeting[] = [];
    let nextCursor: string | undefined = undefined;

    for await (const response of result) {
      if (!response) continue;
      const meetingListResponse = response.result;
      items.push(...meetingListResponse.items.map(convertSDKMeeting));
      nextCursor = meetingListResponse.nextCursor || undefined;
      break; // Only get first page
    }

    return { items, nextCursor };
  } catch (error) {
    // Fallback to direct HTTP for network/connection errors
    logger.warn("Fathom SDK error, using HTTP fallback:", error instanceof Error ? error.message : String(error));
    return await listMeetingsHTTP(filter);
  }
}

// HTTP fallback for when SDK validation fails
async function listMeetingsHTTP(filter: MeetingFilter): Promise<Paginated<Meeting>> {
  const params: string[] = [];
  if (filter.cursor) params.push(`cursor=${encodeURIComponent(filter.cursor)}`);
  if (filter.calendarInvitees?.length) {
    filter.calendarInvitees.forEach((email) => params.push(`calendar_invitees[]=${encodeURIComponent(email)}`));
  }
  if (filter.calendarInviteesDomains?.length) {
    filter.calendarInviteesDomains.forEach((domain) =>
      params.push(`calendar_invitees_domains[]=${encodeURIComponent(domain)}`),
    );
  }
  if (filter.teams?.length) {
    filter.teams.forEach((team) => params.push(`teams[]=${encodeURIComponent(team)}`));
  }
  if (filter.recordedBy?.length) {
    filter.recordedBy.forEach((email) => params.push(`recorded_by[]=${encodeURIComponent(email)}`));
  }

  // Always include action items count in the response
  params.push("include_action_items=true");

  // Include summaries and transcripts for caching
  params.push("include_summary=true");
  params.push("include_transcript=true");

  const queryString = params.length > 0 ? `?${params.join("&")}` : "";
  const resp = await authGet<unknown>(`/meetings${queryString}`);

  if (typeof resp !== "object" || resp === null) {
    return { items: [], nextCursor: undefined };
  }

  const r = resp as Record<string, unknown>;
  const itemsRaw = Array.isArray(r["items"]) ? (r["items"] as unknown[]) : [];
  const items = itemsRaw.map(mapMeetingFromHTTP).filter((m): m is Meeting => Boolean(m));
  const nextCursor = toStringOrUndefined(r["next_cursor"]) || undefined;

  return { items, nextCursor };
}

// Map raw HTTP response to Meeting type
function mapMeetingFromHTTP(raw: unknown): Meeting | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const r = raw as Record<string, unknown>;

  const recordingId =
    toStringOrUndefined(r["recording_id"]) ?? (isNumber(r["recording_id"]) ? String(r["recording_id"]) : undefined);
  if (!recordingId) return undefined;

  const title = toStringOrUndefined(r["title"]) ?? "Untitled";
  const meetingTitle = toStringOrUndefined(r["meeting_title"]);
  const url = toStringOrUndefined(r["url"]) ?? "";
  const shareUrl = toStringOrUndefined(r["share_url"]);
  const startTimeISO = toStringOrUndefined(r["recording_start_time"]) ?? "";
  if (!startTimeISO) return undefined;

  const createdAt = toStringOrUndefined(r["created_at"]);
  const scheduledStartTime = toStringOrUndefined(r["scheduled_start_time"]);
  const scheduledEndTime = toStringOrUndefined(r["scheduled_end_time"]);
  const recordingEndTime = toStringOrUndefined(r["recording_end_time"]);

  // Calculate duration if we have both times
  let durationSeconds: number | undefined;
  if (recordingEndTime && startTimeISO) {
    const start = new Date(startTimeISO).getTime();
    const end = new Date(recordingEndTime).getTime();
    durationSeconds = Math.floor((end - start) / 1000);
  }

  const calendarInviteesDomainType = toStringOrUndefined(r["calendar_invitees_domains_type"]) as
    | "all"
    | "only_internal"
    | "one_or_more_external"
    | undefined;
  const isExternal = calendarInviteesDomainType === "one_or_more_external";
  const transcriptLanguage = toStringOrUndefined(r["transcript_language"]);

  // Parse calendar invitees
  const calendarInviteesRaw = Array.isArray(r["calendar_invitees"]) ? r["calendar_invitees"] : [];
  const calendarInvitees = calendarInviteesRaw
    .map((inv: unknown) => {
      if (typeof inv === "object" && inv !== null) {
        return toStringOrUndefined((inv as Record<string, unknown>)["email"]);
      }
      return undefined;
    })
    .filter((email): email is string => Boolean(email));

  const calendarInviteesDomains = Array.from(
    new Set(calendarInvitees.map((email) => email.split("@")[1]).filter(Boolean)),
  );

  // Parse recorded_by
  const recordedBy = r["recorded_by"];
  let recordedByUserId: string | undefined;
  let recordedByName: string | undefined;
  let recordedByTeam: string | null | undefined;

  if (typeof recordedBy === "object" && recordedBy !== null) {
    const rb = recordedBy as Record<string, unknown>;
    recordedByUserId = toStringOrUndefined(rb["email"]);
    recordedByName = toStringOrUndefined(rb["name"]);
    recordedByTeam = toStringOrUndefined(rb["team"]) ?? null;
  }

  // Parse action items array and derive count
  const actionItemsRaw = Array.isArray(r["action_items"]) ? r["action_items"] : [];
  const actionItems = actionItemsRaw
    .map((item: unknown) => {
      if (typeof item !== "object" || item === null) return undefined;
      const ai = item as Record<string, unknown>;

      const description = toStringOrUndefined(ai["description"]);
      if (!description) return undefined;

      const userGenerated = Boolean(ai["user_generated"]);
      const completed = Boolean(ai["completed"]);
      const recordingTimestamp = toStringOrUndefined(ai["recording_timestamp"]) || "00:00:00";
      const recordingPlaybackUrl = toStringOrUndefined(ai["recording_playback_url"]) || "";

      // Parse assignee
      let assignee: { name: string | null; email: string | null; team: string | null } = {
        name: null,
        email: null,
        team: null,
      };
      if (typeof ai["assignee"] === "object" && ai["assignee"] !== null) {
        const assigneeObj = ai["assignee"] as Record<string, unknown>;
        assignee = {
          name: toStringOrUndefined(assigneeObj["name"]) ?? null,
          email: toStringOrUndefined(assigneeObj["email"]) ?? null,
          team: toStringOrUndefined(assigneeObj["team"]) ?? null,
        };
      }

      return {
        description,
        userGenerated,
        completed,
        recordingTimestamp,
        recordingPlaybackUrl,
        assignee,
      };
    })
    .filter((ai): ai is NonNullable<typeof ai> => Boolean(ai));

  const actionItemsCount = actionItems.length > 0 ? actionItems.length : undefined;

  // Parse embedded summary if present
  let summaryText: string | undefined;
  if (typeof r["summary"] === "object" && r["summary"] !== null) {
    const summaryObj = r["summary"] as Record<string, unknown>;
    summaryText = toStringOrUndefined(summaryObj["markdown_formatted"]);
  }

  // Parse embedded transcript if present
  let transcriptText: string | undefined;
  if (Array.isArray(r["transcript"])) {
    const transcriptArray = r["transcript"] as unknown[];
    const segments = transcriptArray
      .map((item) => {
        if (typeof item !== "object" || item === null) return undefined;
        const t = item as Record<string, unknown>;

        let speaker: string | undefined;
        if (typeof t["speaker"] === "object" && t["speaker"] !== null) {
          const speakerObj = t["speaker"] as Record<string, unknown>;
          speaker = toStringOrUndefined(speakerObj["display_name"]);
        }

        const timestamp = toStringOrUndefined(t["timestamp"]) || "00:00:00";
        const text = toStringOrUndefined(t["text"]) || "";

        return speaker && text ? `**${speaker}** [${timestamp}]\n${text}\n` : text;
      })
      .filter(Boolean);

    transcriptText = segments.join("\n");
  }

  return {
    id: recordingId,
    recordingId,
    title,
    meetingTitle,
    url,
    shareUrl,
    createdAt,
    scheduledStartTime,
    scheduledEndTime,
    startTimeISO,
    recordingEndTime,
    durationSeconds,
    calendarInviteesDomainType,
    isExternal,
    transcriptLanguage,
    calendarInvitees,
    calendarInviteesDomains,
    recordedByUserId,
    recordedByName,
    recordedByTeam,
    actionItems,
    actionItemsCount,
    summaryText,
    transcriptText,
    teamId: undefined,
    teamName: null,
  };
}

export async function getMeetingSummary(recordingId: string): Promise<Summary> {
  logger.log(`[API] 📝 getMeetingSummary called for recordingId: ${recordingId}`);
  const resp = await authGet<unknown>(`/recordings/${encodeURIComponent(recordingId)}/summary`);

  if (typeof resp !== "object" || resp === null) {
    return { text: "", templateName: null };
  }

  const r = resp as Record<string, unknown>;

  // API returns: { summary: { template_name: "general", markdown_formatted: "..." } }
  if (typeof r["summary"] === "object" && r["summary"] !== null) {
    const summary = r["summary"] as Record<string, unknown>;
    const text = toStringOrUndefined(summary["markdown_formatted"]) || "";
    const templateName = toStringOrUndefined(summary["template_name"]);
    return { text, templateName };
  }

  // Fallback for other response formats
  const text = toStringOrUndefined(r["markdown_formatted"]) || toStringOrUndefined(r["text"]) || "";
  return { text, templateName: null };
}

export async function getMeetingTranscript(recordingId: string): Promise<Transcript> {
  logger.log(`[API] 📄 getMeetingTranscript called for recordingId: ${recordingId}`);
  const resp = await authGet<unknown>(`/recordings/${encodeURIComponent(recordingId)}/transcript`);

  if (typeof resp !== "object" || resp === null) {
    return { text: "" };
  }

  const r = resp as Record<string, unknown>;

  // API returns: { transcript: [ { speaker: {...}, text: "...", timestamp: "00:05:32" }, ... ] }
  const transcriptArray = Array.isArray(r["transcript"]) ? (r["transcript"] as unknown[]) : [];

  const segments = transcriptArray
    .map((item) => {
      if (typeof item !== "object" || item === null) return undefined;
      const t = item as Record<string, unknown>;

      // Parse speaker
      let speaker: string | undefined;
      if (typeof t["speaker"] === "object" && t["speaker"] !== null) {
        const speakerObj = t["speaker"] as Record<string, unknown>;
        speaker = toStringOrUndefined(speakerObj["display_name"]);
      } else {
        speaker = toStringOrUndefined(t["speaker"]);
      }

      // Parse timestamp (HH:MM:SS format)
      const timestamp = toStringOrUndefined(t["timestamp"]) || "00:00:00";
      const startSeconds = parseTimestamp(timestamp);

      const text = toStringOrUndefined(t["text"]) || "";

      return {
        startSeconds,
        endSeconds: startSeconds, // We don't have end time, use start
        speaker,
        text,
        timestamp,
      };
    })
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  // Build full text from segments using formatter
  const fullText = formatTranscriptToMarkdown(segments);

  return { text: fullText, segments };
}

export async function listTeams(
  args: { pageSize?: number; cursor?: string; query?: string; maxPages?: number } = {},
): Promise<Paginated<Team>> {
  logger.log(`[API] 👥 listTeams called with args:`, args);
  logger.log(`[API] 🔵 Calling Fathom SDK client.listTeams()...`);
  try {
    const client = getFathomClient();
    const maxPages = args.maxPages ?? 10; // Generous default: ~100-500 teams depending on page size

    const result = await client.listTeams({
      cursor: args.cursor,
    });

    const items: Team[] = [];
    let nextCursor: string | undefined = undefined;
    let pageCount = 0;

    for await (const response of result) {
      if (!response?.result) continue;

      pageCount++;
      if (pageCount > maxPages) {
        logger.log(`[API] 👥 Reached maxPages limit (${maxPages}), stopping pagination`);
        break;
      }

      const teamListResponse = response.result;
      const pageItems = teamListResponse.items.map(convertSDKTeam);
      items.push(...pageItems);
      nextCursor = teamListResponse.nextCursor || undefined;

      if (pageCount > 1) {
        logger.log(`[API] 👥 Fetched page ${pageCount}: ${pageItems.length} teams (total: ${items.length})`);
      }

      // Continue fetching all pages automatically unless maxPages limit is reached
      if (!nextCursor) {
        logger.log(`[API] 👥 Pagination complete: ${pageCount} pages, ${items.length} total teams`);
        break;
      }
    }

    return { items, nextCursor };
  } catch (error) {
    // Fallback to direct HTTP for network/connection errors
    logger.warn("Fathom SDK error, using HTTP fallback:", error instanceof Error ? error.message : String(error));
    return await listTeamsHTTP(args);
  }
}

// HTTP fallback for listTeams
async function listTeamsHTTP(
  args: { pageSize?: number; cursor?: string; query?: string } = {},
): Promise<Paginated<Team>> {
  logger.log(`[API] 👥 listTeamsHTTP called with args:`, args);
  const params: string[] = [];
  if (args.cursor) params.push(`cursor=${encodeURIComponent(args.cursor)}`);

  const queryString = params.length > 0 ? `?${params.join("&")}` : "";
  const resp = await authGet<unknown>(`/teams${queryString}`);

  if (typeof resp !== "object" || resp === null) {
    return { items: [], nextCursor: undefined };
  }

  const r = resp as Record<string, unknown>;
  const itemsRaw = Array.isArray(r["items"]) ? (r["items"] as unknown[]) : [];
  const items = itemsRaw.map(mapTeamFromHTTP).filter((t): t is Team => Boolean(t));
  const nextCursor = toStringOrUndefined(r["next_cursor"]) || undefined;

  return { items, nextCursor };
}

// Map raw HTTP response to Team type
function mapTeamFromHTTP(raw: unknown): Team | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const r = raw as Record<string, unknown>;

  const name = toStringOrUndefined(r["name"]);
  if (!name) return undefined;

  const createdAt = toStringOrUndefined(r["created_at"]);

  return {
    id: name, // Use name as ID since API doesn't provide separate ID
    name,
    createdAt,
    memberCount: undefined,
  };
}

export async function listTeamMembers(
  teamId?: string,
  args: { pageSize?: number; cursor?: string; query?: string } = {},
): Promise<Paginated<TeamMember>> {
  logger.log(`[API] 👤 listTeamMembers called for teamId: ${teamId} with args:`, args);
  logger.log(`[API] 🔵 Calling Fathom SDK client.listTeamMembers()...`);
  try {
    const client = getFathomClient();

    // Build request params, only include team if it's defined
    const requestParams: { cursor?: string; team?: string } = {
      cursor: args.cursor,
    };
    if (teamId) {
      requestParams.team = teamId;
    }

    const result = await client.listTeamMembers(requestParams);

    const items: TeamMember[] = [];
    let nextCursor: string | undefined = undefined;

    for await (const response of result) {
      if (!response?.result) continue;
      const teamMemberListResponse = response.result;
      items.push(...teamMemberListResponse.items.map((tm) => convertSDKTeamMember(tm, teamId)));
      nextCursor = teamMemberListResponse.nextCursor || undefined;
      // Continue fetching all pages automatically
    }

    return { items, nextCursor };
  } catch (error) {
    // Fallback to direct HTTP for network/connection errors
    logger.warn("Fathom SDK error, using HTTP fallback:", error instanceof Error ? error.message : String(error));
    return await listTeamMembersHTTP(teamId, args);
  }
}

// HTTP fallback for listTeamMembers
async function listTeamMembersHTTP(
  teamId?: string,
  args: { pageSize?: number; cursor?: string; query?: string } = {},
): Promise<Paginated<TeamMember>> {
  const params: string[] = [];
  if (args.cursor) params.push(`cursor=${encodeURIComponent(args.cursor)}`);
  if (teamId) params.push(`team=${encodeURIComponent(teamId)}`);

  const queryString = params.length > 0 ? `?${params.join("&")}` : "";
  const resp = await authGet<unknown>(`/team_members${queryString}`);

  if (typeof resp !== "object" || resp === null) {
    return { items: [], nextCursor: undefined };
  }

  const r = resp as Record<string, unknown>;
  const itemsRaw = Array.isArray(r["items"]) ? (r["items"] as unknown[]) : [];
  const items = itemsRaw.map(mapTeamMemberFromHTTP).filter((tm): tm is TeamMember => Boolean(tm));
  const nextCursor = toStringOrUndefined(r["next_cursor"]) || undefined;

  return { items, nextCursor };
}

// Map raw HTTP response to TeamMember type
function mapTeamMemberFromHTTP(raw: unknown): TeamMember | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const r = raw as Record<string, unknown>;

  const name = toStringOrUndefined(r["name"]);
  const email = toStringOrUndefined(r["email"]);

  if (!name || !email) return undefined;

  const emailDomain = email.includes("@") ? email.split("@")[1] : undefined;
  const createdAt = toStringOrUndefined(r["created_at"]);
  const team = toStringOrUndefined(r["team"]);

  return {
    id: email, // Use email as ID
    name,
    email,
    emailDomain,
    createdAt,
    teamId: undefined,
    team: team || undefined,
  };
}
