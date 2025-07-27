const baseUrl = "https://www.threads.net/intent/";

interface FollowIntentParams {
  username: string;
}

export function constructFollowIntent({
  username,
}: FollowIntentParams): string {
  const intent = "follow";
  const cleanUsername = username.startsWith("@") ? username.slice(1) : username;
  const params = new URLSearchParams({ username: cleanUsername });

  return `${baseUrl}${intent}?${params.toString()}`;
}
