import { Tool } from "@raycast/api";
import { createLink, normalizeUrl } from "../api";

type Input = {
  /** HTTP or HTTPS URL to save. Missing schemes default to HTTPS. */
  url: string;
  /** Optional custom title; Shiori extracts one when omitted. */
  title?: string;
  /** Save as already read. Defaults to false (unread). */
  read?: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Save this bookmark to Shiori? An existing bookmark will be bumped to the top of your inbox.",
  info: [
    { name: "URL", value: normalizeUrl(input.url) },
    ...(input.title?.trim() ? [{ name: "Title", value: input.title.trim() }] : []),
    { name: "Save as", value: input.read ? "Read" : "Unread" },
  ],
});

/** Save a bookmark after confirmation. Metadata and summaries are processed asynchronously by Shiori. */
export default async function tool(input: Input) {
  const url = normalizeUrl(input.url);
  const result = await createLink(url, input.title, input.read);
  return {
    id: result.linkId,
    url,
    duplicate: result.duplicate ?? false,
    message: result.duplicate
      ? "Already saved; bumped to the top of the inbox."
      : "Bookmark saved; processing may still be pending.",
  };
}
