import { Toast, showToast } from "@raycast/api";

/**
 * Run one request per workspace and keep what came back.
 *
 * One workspace refusing (a permission set without task access, a hiccup) must
 * not blank the others — but it must not pass silently either, or its tasks
 * simply look absent. So: the answers that arrived, a toast naming the failure,
 * and a thrown error only when nothing arrived at all.
 */
export async function acrossWorkspaces<S, T>(workspaces: S[], load: (workspace: S) => Promise<T>) {
  const settled = await Promise.allSettled(workspaces.map(load));
  const values = settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  const failures = settled.flatMap((result) => (result.status === "rejected" ? [result.reason] : []));

  if (failures.length > 0 && values.length === 0) throw failures[0];
  if (failures.length > 0) {
    const reason = failures[0];
    await showToast({
      style: Toast.Style.Failure,
      title:
        failures.length === 1
          ? "One workspace could not be loaded"
          : `${failures.length} workspaces could not be loaded`,
      message: reason instanceof Error ? reason.message : String(reason),
    });
  }
  return values;
}

/**
 * Rows by id, first occurrence kept. Offset paging over a sort that edits move
 * can hand the same task back on the next page; a list must not show it twice.
 */
export function uniqueById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => !seen.has(row.id) && Boolean(seen.add(row.id)));
}
