import { Tool } from "@raycast/api";
import { createPost, parseList, platformName } from "../api";

type Input = {
  /**
   * Username of the Upload-Post profile that publishes the post. Get it from the get-profiles tool.
   */
  profile: string;
  /**
   * Comma-separated Upload-Post platform ids to publish to, for example "x,linkedin" or "tiktok,instagram,youtube". Valid ids include x, linkedin, instagram, tiktok, youtube, facebook, threads, bluesky and pinterest. Only use platforms connected to the profile.
   */
  platforms: string;
  /**
   * Kind of post: "text" (no media), "photo" (one or more images) or "video" (exactly one video).
   */
  type: "text" | "photo" | "video";
  /**
   * Text of the post. For photo and video posts this is the title/caption. Required for text posts and when publishing to YouTube.
   */
  title: string;
  /**
   * Optional longer description for photo and video posts (used on YouTube, LinkedIn, Facebook and Pinterest).
   */
  description?: string;
  /**
   * Media to publish, as http(s) URLs or absolute local file paths separated by new lines. Exactly one item for video posts, one or more for photo posts, empty for text posts.
   */
  media?: string;
  /**
   * Optional date and time to publish, in ISO-8601 (for example "2026-10-01T09:00:00+02:00"). Must be in the future and at most 365 days ahead. Omit to publish now.
   */
  scheduledDate?: string;
  /**
   * Optional IANA timezone (for example "Europe/Madrid") used to interpret scheduledDate when it has no offset.
   */
  timezone?: string;
  /**
   * Set to true to publish in the next free slot of the profile's queue instead of a fixed date. Never combine with scheduledDate.
   */
  addToQueue?: boolean;
  /**
   * Optional first comment posted right after publishing (supported on Instagram, Facebook, Threads, Bluesky, X, YouTube, LinkedIn and TikTok).
   */
  firstComment?: string;
};

export default async function tool(input: Input) {
  const result = await createPost({
    ...input,
    platforms: parseList(input.platforms),
    media: parseList(input.media, /\n/),
  });
  return {
    success: result.success ?? true,
    message: result.message,
    request_id: result.request_id,
    job_id: result.job_id,
    scheduled_date: result.scheduled_date,
    warnings: result.warnings,
  };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const media = parseList(input.media, /\n/);
  const when = input.addToQueue
    ? "Next queue slot"
    : input.scheduledDate
      ? `${input.scheduledDate}${input.timezone ? ` (${input.timezone})` : ""}`
      : "Now";
  return {
    message: input.addToQueue || input.scheduledDate ? "Schedule this post?" : "Publish this post now?",
    info: [
      { name: "Profile", value: input.profile },
      { name: "Platforms", value: parseList(input.platforms).map(platformName).join(", ") },
      { name: "Type", value: input.type },
      { name: "Text", value: input.title },
      { name: "Description", value: input.description },
      { name: "Media", value: media.length ? media.join("\n") : undefined },
      { name: "When", value: when },
      { name: "First Comment", value: input.firstComment },
    ],
  };
};
