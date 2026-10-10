import { Tool } from "@raycast/api";
import { createTemporaryLink } from "../api/client";
import { findDestination } from "../lib/destinations";
import { cleanText } from "../lib/markdown";

type Input = {
  /** The full key (path) of the file in the bucket, e.g. "screenshots/2026/shot.png". */
  key: string;
  /** The destination the file is in: its exact name or bucket. Leave empty for the default destination. */
  destination?: string;
  /** How long the link should work, in hours. Defaults to 1, at most 24. */
  expiresInHours?: number;
};

const DEFAULT_HOURS = 1;
const MAX_HOURS = 24;

function hoursFor(input: Input) {
  return Math.min(Math.max(input.expiresInHours ?? DEFAULT_HOURS, 1 / 60), MAX_HOURS);
}

function keyFor(input: Input) {
  return input.key.trim().replace(/^\/+/, "");
}

function describeHours(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)} minutes`;
  return hours === 1 ? "1 hour" : `${Math.round(hours * 10) / 10} hours`;
}

/** Anyone with the link can download the file until it expires, even from a private bucket, so the user confirms it first. */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const destination = await findDestination(input.destination);
  return {
    message: `Create a link to this file that anyone can open for ${describeHours(hoursFor(input))}?`,
    info: [
      { name: "File", value: cleanText(keyFor(input)) },
      { name: "Destination", value: `${destination.name} (${destination.bucket})` },
    ],
  };
};

/**
 * Create a temporary, presigned link to a file in a bucket. It works even for
 * private buckets and stops working after it expires. Anyone with the link can
 * download the file until then. Use it when the user asks for a temporary or
 * private link, or when a file has no public link.
 */
export default async function tool(input: Input) {
  const destination = await findDestination(input.destination);
  const hours = hoursFor(input);
  const key = keyFor(input);
  const link = await createTemporaryLink(destination.id, key, Math.round(hours * 3600));
  return { destination: destination.name, key, url: link.url, expiresAt: link.expiresAt };
}
