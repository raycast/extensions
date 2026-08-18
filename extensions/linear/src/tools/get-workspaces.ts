import { entryKey, getActiveEntry, migrateIfNeeded } from "../api/workspaces";

// Registry-only read: works even when a workspace's token is dead, and never
// triggers an OAuth flow — so it is deliberately NOT wrapped in withWorkspaceAuth.
export default async function () {
  const registry = await migrateIfNeeded({ allowWrite: false });
  const active = getActiveEntry(registry);
  return registry.workspaces.map((w) => ({
    workspaceId: entryKey(w),
    name: w.orgName,
    urlKey: w.urlKey,
    userEmail: w.userEmail,
    isActive: active !== null && entryKey(w) === entryKey(active),
  }));
}
