import { getAuthenticatedArena } from "./arenaAuth";
import { userSummary } from "./summarize";

/**
 * Return the currently authenticated Are.na user (profile counts and profile URL).
 */
export default async function tool() {
  try {
    const arena = await getAuthenticatedArena();
    const me = await arena.me();
    return { user: userSummary(me) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { error: message };
  }
}
