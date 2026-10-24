import { pondClient } from "../api";
import { validatedTags, validatedUrl } from "../api/client";

type Input = {
  /** The complete HTTP or HTTPS URL to archive in the active Pond library. */
  url: string;
  /** Optional tags to add to the save. For an existing URL, Pond merges these with its current tags. */
  tags?: string[];
};

export default async function SaveUrl({ url, tags }: Input) {
  const result = await pondClient().enqueue(url, tags);
  return { ...result, status: result.created ? "queued" : tags?.length ? "tags_added" : "already_saved" };
}

export function confirmation({ url, tags }: Input) {
  return {
    info: [
      { name: "URL", value: validatedUrl(url) },
      { name: "Destination", value: "Active Pond library" },
      ...(tags?.length ? [{ name: "Tags", value: validatedTags(tags).join(", ") }] : []),
    ],
  };
}
