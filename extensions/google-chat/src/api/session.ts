import { Cache } from "@raycast/api";

import { signOut } from "./google";

/** Signs out and forgets cached people, memberships and unread state, which belong to the old account. */
export async function signOutAndClearCaches(): Promise<void> {
  await signOut();
  for (const namespace of ["people", "members", "unread", "spaces"]) {
    new Cache({ namespace }).clear();
  }
}
