import { LocalStorage } from "@raycast/api";
import { usernameFromCommitUrl } from "./lib/api";

/** Where the username from the user's last commit is kept, for My Profile and My Commits. */
export const USERNAME_KEY = "username";

/**
 * Remembers whose account just posted, read from the new commit's URL. Never fails a commit that has posted.
 * Stored as JSON, because useLocalStorage() parses what it reads.
 */
export async function rememberUsername(commitUrl: string | undefined) {
  const username = usernameFromCommitUrl(commitUrl);
  if (username) await LocalStorage.setItem(USERNAME_KEY, JSON.stringify(username)).catch(() => undefined);
}
