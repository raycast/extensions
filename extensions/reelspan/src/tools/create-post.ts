import { Tool } from "@raycast/api";
import { client, prefs } from "../lib/client";
import { networkName, publish, results, type PostDraft } from "../lib/reelspan";

type Input = {
  /** The profile username (from get-profiles). Leave empty to use the default profile from the preferences. */
  profile?: string;
  /** "text", "video" or "photos" */
  type: "text" | "video" | "photos";
  /** Network ids, e.g. ["x", "linkedin"]: tiktok, youtube, instagram, facebook, x, threads, linkedin, pinterest, bluesky, reddit, mastodon, discord, telegram, slack… */
  platforms: string[];
  /** The post text or caption */
  text?: string;
  /** Public URLs or local file paths of the video or photos, in order */
  media?: string[];
  /** ISO-8601 date-time to publish later; leave empty to post now */
  scheduledDate?: string;
  /** IANA timezone of scheduledDate */
  timezone?: string;
  /** Posted as the first comment */
  firstComment?: string;
};

const draft = (input: Input): PostDraft => ({ ...input, profile: input.profile || prefs().defaultProfile || "" });

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const d = draft(input);
  return {
    message: d.scheduledDate ? "Schedule this post?" : "Publish this post now?",
    info: [
      { name: "Profile", value: d.profile },
      { name: "Networks", value: d.platforms.map(networkName).join(", ") },
      { name: "Type", value: d.type },
      ...(d.text ? [{ name: "Text", value: d.text }] : []),
      ...(d.media?.length ? [{ name: "Media", value: d.media.join("\n") }] : []),
      ...(d.scheduledDate
        ? [{ name: "When", value: `${d.scheduledDate}${d.timezone ? ` (${d.timezone})` : ""}` }]
        : []),
    ],
  };
};

/** Publishes or schedules a post and returns each network's result and link. */
export default async function tool(input: Input) {
  const r = await publish(client(), draft(input));
  return { request_id: r.request_id, job_id: r.job_id, status: r.status, results: results(r) };
}
