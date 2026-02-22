import { createRestAPIClient } from "masto";
import type { mastodon } from "masto";
import type { MastodonAccount } from "./accounts";

export type MastodonClient = mastodon.rest.Client;

export function createClient(account: MastodonAccount): MastodonClient {
  return createRestAPIClient({
    url: `https://${account.instance}`,
    accessToken: account.token,
  });
}

export async function verifyCredentials(
  client: MastodonClient,
): Promise<mastodon.v1.Account> {
  return client.v1.accounts.verifyCredentials();
}

export async function postStatus(
  client: MastodonClient,
  params: {
    status: string;
    mediaIds?: string[];
  },
): Promise<mastodon.v1.Status> {
  return client.v1.statuses.create({
    status: params.status,
    visibility: "public",
    mediaIds: params.mediaIds,
  });
}

export async function uploadMedia(
  client: MastodonClient,
  blob: Blob,
  description?: string,
): Promise<mastodon.v1.MediaAttachment> {
  const file = new File([blob], "media", { type: blob.type });
  return client.v2.media.create({
    file,
    description,
  });
}
