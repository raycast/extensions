import { createTemporaryLink } from "../api/client";
import { findDestination } from "../lib/destinations";

type Input = {
  /** The full key (path) of the file in the bucket, e.g. "screenshots/2026/shot.png". */
  key: string;
  /** The destination the file is in: its name or bucket. Leave empty for the default destination. */
  destination?: string;
  /** How long the link should work, in hours. Defaults to 24, at most 168 (7 days). */
  expiresInHours?: number;
};

/**
 * Create a temporary, presigned link to a file in a bucket. It works even for
 * private buckets and stops working after it expires. Use it when the user asks
 * for a temporary or private link, or when a file has no public link.
 */
export default async function tool(input: Input) {
  const destination = await findDestination(input.destination);
  const hours = Math.min(Math.max(input.expiresInHours ?? 24, 1 / 60), 168);
  const key = input.key.trim().replace(/^\/+/, "");
  const link = await createTemporaryLink(destination.id, key, Math.round(hours * 3600));
  return { destination: destination.name, key, url: link.url, expiresAt: link.expiresAt };
}
