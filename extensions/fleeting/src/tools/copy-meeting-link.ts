import { Clipboard } from "@raycast/api";
import { getMeeting, isMeetingId } from "../data/meetings";
import { meetingUrl } from "../lib/urls";

type Input = {
  /** A meeting ID returned by list-meetings. */
  meetingId: string;
};

/** Copies a fictional meeting's join link to the clipboard. */
export default async function tool(input: Input) {
  if (!isMeetingId(input.meetingId)) throw new Error("Unknown meeting ID. Use list-meetings to find an ID.");
  const url = meetingUrl(input.meetingId);
  await Clipboard.copy(url);
  return { status: "copied", meetingId: input.meetingId, title: getMeeting(input.meetingId).title, url };
}
