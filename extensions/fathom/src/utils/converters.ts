/**
 * Type conversion utilities for mapping between SDK types and internal types
 */

import type { Meeting, Recording, Team, TeamMember } from "../types/Types";
import type { Meeting as SDKMeeting } from "fathom-typescript/models/meeting";
import type { Team as SDKTeam } from "fathom-typescript/models/team";
import type { TeamMember as SDKTeamMember } from "fathom-typescript/models/teammember";

/**
 * Extended SDK TeamMember type that includes undocumented API response fields
 */
type SDKTeamMemberWithExtras = SDKTeamMember & {
  team?: string;
};

/**
 * Convert SDK Meeting to internal Meeting type
 */
export function convertSDKMeeting(m: SDKMeeting): Meeting {
  const recordingStart = m.recordingStartTime.toISOString();
  const durationMs = m.recordingEndTime.getTime() - m.recordingStartTime.getTime();
  const durationSeconds = Math.floor(durationMs / 1000);

  return {
    id: m.url.split("/").pop() || m.url,
    title: m.title || "Untitled",
    startTimeISO: recordingStart,
    durationSeconds,
    teamId: undefined,
    teamName: null,
    url: m.shareUrl,
    recordedByUserId: m.recordedBy.email,
    recordingId: m.url.split("/").pop() || m.url,
    isExternal: m.meetingType === "external",
    calendarInvitees: m.calendarInvitees.map((inv) => inv.email).filter((email): email is string => email !== null),
    calendarInviteesDomains: Array.from(
      new Set(m.calendarInvitees.map((inv) => inv.email?.split("@")[1] || "").filter(Boolean)),
    ),
  };
}

/**
 * Convert SDK Team to internal Team type
 */
export function convertSDKTeam(t: SDKTeam): Team {
  return {
    id: t.name,
    name: t.name,
    memberCount: undefined,
  };
}

/**
 * Convert SDK TeamMember to internal TeamMember type
 */
export function convertSDKTeamMember(tm: SDKTeamMemberWithExtras, teamName?: string): TeamMember {
  const emailDomain = tm.email && tm.email.includes("@") ? tm.email.split("@")[1] : undefined;

  // Extract team from SDK response if available (not in SDK types but present in API response)
  const teamFromSDK = tm.team || undefined;

  return {
    id: tm.email,
    name: tm.name,
    email: tm.email,
    emailDomain,
    teamId: undefined,
    team: teamFromSDK || teamName || undefined,
  };
}

/**
 * Map Meeting to Recording (for backwards compatibility)
 */
export function mapRecordingFromMeeting(m: Meeting): Recording {
  return {
    id: m.recordingId ?? m.id,
    meetingId: m.id,
    title: m.title,
    startTimeISO: m.startTimeISO,
    durationSeconds: m.durationSeconds,
    teamId: m.teamId,
    teamName: m.teamName ?? null,
    url: m.url,
    ownerUserId: m.recordedByUserId,
  };
}
