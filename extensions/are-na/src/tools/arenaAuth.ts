import { getPreferenceValues } from "@raycast/api";
import { Arena } from "../api/arena";
import { arenaOAuth } from "../api/oauth";

/**
 * Arena client for AI tools: uses Personal Access Token from preferences if set,
 * otherwise OAuth (may open the browser to sign in).
 */
export async function getAuthenticatedArena(): Promise<Arena> {
  const prefs = getPreferenceValues<Preferences>();
  const pat = prefs.accessToken?.trim();
  const token = pat && pat.length > 0 ? pat : await arenaOAuth.authorize();
  return new Arena({ accessToken: token });
}
