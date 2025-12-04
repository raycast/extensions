/**
 * Type conversion utilities for mapping between SDK types and internal types
 */

import type { Meeting, Team, TeamMember } from "../types/Types";
import type { Meeting as SDKMeeting } from "fathom-typescript/sdk/models/shared/meeting";
import type { Team as SDKTeam } from "fathom-typescript/sdk/models/shared/team";
import type { TeamMember as SDKTeamMember } from "fathom-typescript/sdk/models/shared/teammember";

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

  // SDK v0.0.36+ provides recordingId as a number
  const recordingId = String(m.recordingId);

  // Extract team info from recordedBy
  const recordedByTeam = m.recordedBy?.team;
  const recordedByName = m.recordedBy?.name;

  // Extract action items count
  const actionItemsCount = m.actionItems?.length || 0;

  return {
    id: recordingId,
    title: m.title || "Untitled",
    meetingTitle: m.meetingTitle || undefined,
    startTimeISO: recordingStart,
    createdAt: m.createdAt.toISOString(),
    durationSeconds,
    teamId: undefined,
    teamName: recordedByTeam || null,
    recordedByTeam,
    recordedByName,
    url: m.url,
    shareUrl: m.shareUrl,
    recordedByUserId: m.recordedBy.email,
    recordingId,
    actionItemsCount,
    actionItems: m.actionItems || undefined,
    calendarInvitees: m.calendarInvitees.map((inv) => inv.email).filter((email): email is string => email != null),
    calendarInviteesDomains: Array.from(
      new Set(
        m.calendarInvitees
          .map((inv) => inv.email?.split("@")[1])
          .filter((domain): domain is string => domain != null && domain !== ""),
      ),
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
