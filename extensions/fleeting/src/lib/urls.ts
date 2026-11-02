import { DEFAULT_MEETING_ID, MEETINGS, MeetingId, isMeetingId } from "../data/meetings";

export const BASE_URL = "https://iminafleeting.com/";
export const DEFAULT_VOICE = "en-US";

/** Builds the Fleeting URL for a meeting. Throws on an unknown ID. */
export function meetingUrl(id: MeetingId): string {
  if (!isMeetingId(id)) throw new Error(`Unknown meeting ID: ${String(id)}`);
  const url = new URL(BASE_URL);
  url.searchParams.set("m", id);
  url.searchParams.set("v", DEFAULT_VOICE);
  return url.toString();
}

/** Returns a valid meeting ID, falling back to Engineering Standup. */
export function resolveMeetingId(value: unknown): MeetingId {
  return isMeetingId(value) ? value : DEFAULT_MEETING_ID;
}

export function randomMeetingId(): MeetingId {
  return MEETINGS[Math.floor(Math.random() * MEETINGS.length)].id;
}
