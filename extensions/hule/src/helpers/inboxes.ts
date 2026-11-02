import { getGtdSettings } from "../api/client";
import type { Workspace } from "../api/types";

/**
 * The Inbox list of every workspace that has one — Hule's GTD setting, set per
 * workspace, where New Task in the app opens. Create Task offers them first,
 * the way the Telegram bot offers them when no Quick capture list is set.
 *
 * A workspace that does not answer simply has no Inbox list here: the section
 * is a shortcut, and every list stays in the dropdown below it anyway.
 */
export async function inboxListIds(workspaces: Pick<Workspace, "id">[]): Promise<string[]> {
  const settled = await Promise.allSettled(workspaces.map((w) => getGtdSettings(w.id)));
  return settled.flatMap((result) =>
    result.status === "fulfilled" && result.value.inboxListId ? [result.value.inboxListId] : [],
  );
}
