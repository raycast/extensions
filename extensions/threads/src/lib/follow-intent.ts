import { THREADS_INTENT_URL } from "./constants";

const baseUrl = `${THREADS_INTENT_URL}/`;

interface FollowIntentParams {
  username: string;
}

export function constructFollowIntent({ username }: FollowIntentParams): string {
  const intent = "follow";
  const cleanUsername = username.startsWith("@") ? username.slice(1) : username;
  const params = new URLSearchParams({ username: cleanUsername });

  return `${baseUrl}${intent}?${params.toString()}`;
}
