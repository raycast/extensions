import { syncInbox } from "./lib/push-items";
import { getAuthSession } from "./lib/oauth";

export default async function command() {
  // Use getAuthSession (not ensureSignedIn) — this is a background command running on a
  // 1-minute interval. It must never trigger the OAuth browser flow. If there is no valid
  // session, skip silently; the user will be prompted when they explicitly open a command.
  const session = await getAuthSession();
  if (!session) return;
  try {
    await syncInbox();
  } catch (error) {
    console.warn("[nibit] refresh-inbox: sync failed", error);
  }
}
