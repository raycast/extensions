import { Tool } from "@raycast/api";
import { createShortLink, listUploads } from "../api/client";
import type { Upload } from "../api/types";
import { findDestination } from "../lib/destinations";
import { cleanText } from "../lib/markdown";

type Input = {
  /** The exact key of a file uploaded with Aktar, as search-uploads returns it, e.g. "2026/10/report.pdf". */
  key: string;
  /** The destination the file was uploaded to: its exact name or bucket. Leave empty to look in every destination. */
  destination?: string;
};

/** The upload in Aktar's history with exactly this key; a key used in several destinations needs one named. */
async function findUpload(input: Input): Promise<Upload> {
  // Keys are matched as search-uploads returned them: a stored key may itself start with "/" or a space.
  const key = input.key;
  const destination = input.destination ? await findDestination(input.destination) : undefined;
  const uploads = (await listUploads({ query: key, destinationId: destination?.id, limit: 1000 })).filter(
    (upload) => upload.objectKey === key,
  );
  if (uploads.length === 0) throw new Error("No upload with that key in Aktar's history. Use search-uploads first.");
  const destinations = new Set(uploads.map((upload) => upload.destinationId));
  if (destinations.size > 1) throw new Error("Files with that key were uploaded to several destinations. Name one.");
  // History is newest first.
  return uploads[0];
}

/** The link shortener (often a hosted service) sees the file's link and its clicks, so the user confirms it first. */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const upload = await findUpload(input);
  if (upload.shortUrl) return undefined;
  return {
    message: "Make a short link for this file with the destination's link shortener?",
    info: [
      { name: "File", value: cleanText(upload.objectKey) },
      { name: "Destination", value: upload.destinationName },
    ],
  };
};

/**
 * Make a short link for a file uploaded with Aktar, using the link shortener
 * set up for its destination in Aktar, or return the short link it already
 * has. Fails when the destination has no link shortener. Use it when the user
 * asks for a short or shorter link to an upload.
 */
export default async function tool(input: Input) {
  const upload = await findUpload(input);
  const { shortLink, upload: updated } = await createShortLink(upload.id);
  return {
    key: upload.objectKey,
    destination: upload.destinationName,
    shortUrl: shortLink.shortUrl,
    originalUrl: shortLink.targetUrl,
    shortener: shortLink.providerName,
    markdown: updated.formats.markdown,
  };
}
