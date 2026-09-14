import { LinearClient } from "@linear/sdk";
import { updateCommandMetadata } from "@raycast/api";

import { getLinearClientFor } from "../api/linearClient";
import { entryKey, getActiveEntry, migrateIfNeeded, WorkspaceEntry } from "../api/workspaces";

// P3 matching: exact urlKey, else exact account email, else unique orgName prefix, else unique email prefix.
// A match is a ONE-SHOT override — it never writes the registry (design D2).
export async function resolveWorkspaceArgument(
  argument: string | undefined,
): Promise<
  { ok: true; entry: WorkspaceEntry | null; client: LinearClient | undefined } | { ok: false; message: string }
> {
  const query = argument?.trim();
  if (!query) return { ok: true, entry: null, client: undefined }; // no arg → active workspace via sync fast path

  const registry = await migrateIfNeeded({ allowWrite: false });
  const lower = query.toLowerCase();
  const workspaces = registry.workspaces;
  // D10: two entries can share BOTH urlKey and orgName (same org under two accounts),
  // so the account email is a first-class matcher, not just display text.
  const byUrlKey = workspaces.filter((w) => w.urlKey.toLowerCase() === lower);
  const byEmail = workspaces.filter((w) => w.userEmail.toLowerCase() === lower);
  const byNamePrefix = workspaces.filter((w) => w.orgName.toLowerCase().startsWith(lower));
  const byEmailPrefix = workspaces.filter((w) => w.userEmail.toLowerCase().startsWith(lower));
  const candidates =
    byUrlKey.length === 1
      ? byUrlKey
      : byEmail.length === 1
        ? byEmail
        : byNamePrefix.length === 1
          ? byNamePrefix
          : byEmailPrefix.length === 1
            ? byEmailPrefix
            : byUrlKey.length > 0
              ? byUrlKey
              : byEmail.length > 0
                ? byEmail // one account in several orgs: list them as ambiguous
                : byNamePrefix.length > 0
                  ? byNamePrefix
                  : byEmailPrefix.length > 0
                    ? byEmailPrefix
                    : [];

  if (candidates.length === 0) {
    const names = workspaces.map((w) => `${w.orgName} (${w.urlKey}, ${w.userEmail})`).join(", ");
    return { ok: false, message: `No workspace matches "${query}". Connected: ${names || "none"}` };
  }
  if (candidates.length > 1) {
    const names = candidates.map((w) => `${w.orgName} (${w.userEmail})`).join(", ");
    return { ok: false, message: `"${query}" is ambiguous: ${names}. Use the account email to pick one.` };
  }
  const entry = candidates[0];
  const { linearClient } = await getLinearClientFor(
    { orgId: entry.orgId, userId: entry.userId },
    { interactive: true },
  );
  return { ok: true, entry, client: linearClient };
}

// Root-search subtitle for the command pegged to the active workspace: shows
// which workspace it will create in. Hidden entirely for single-workspace
// users (updateCommandMetadata clears it).
export async function updateActiveWorkspaceSubtitle(): Promise<void> {
  try {
    const registry = await migrateIfNeeded({ allowWrite: false });
    if (registry.workspaces.length < 2) {
      await updateCommandMetadata({ subtitle: null });
      return;
    }
    const active = getActiveEntry(registry);
    await updateCommandMetadata({
      subtitle: active ? `Linear — will create in ${active.orgName}` : null,
    });
  } catch {
    // Subtitle is cosmetic — never let it affect the command.
  }
}

// Root-search subtitle for the quick commands that take a `workspace`
// argument: shows the active workspace plus the alternatives the user can
// type. Hidden entirely for single-workspace users (updateCommandMetadata
// clears it).
export async function updateWorkspaceChoicesSubtitle(): Promise<void> {
  try {
    const registry = await migrateIfNeeded({ allowWrite: false });
    if (registry.workspaces.length < 2) {
      await updateCommandMetadata({ subtitle: null });
      return;
    }
    const active = getActiveEntry(registry);
    const others = registry.workspaces.filter((w) => !active || entryKey(w) !== entryKey(active)).map((w) => w.orgName);
    await updateCommandMetadata({
      subtitle: active ? `Linear Workspace - Default: ${active.orgName}, others: ${others.join(", ")}` : null,
    });
  } catch {
    // Subtitle is cosmetic — never let it affect the command.
  }
}
