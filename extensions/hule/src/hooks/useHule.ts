import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { getBundle, getMe } from "../api/client";
import type { AvailableBundle, List, Member, Task, TemplateStatus, User, Workspace } from "../api/types";

export interface HuleContext {
  bundle: AvailableBundle;
  me: User;
  /** Lists that can actually receive a task. */
  openLists: List[];
  workspaceOf: (listId: string) => Workspace | undefined;
  listOf: (listId: string) => List | undefined;
  statusesOf: (listId: string) => TemplateStatus[];
  /** The membership that is *me* in a workspace — the value `assigneeId` takes. */
  myMemberId: (workspaceId: string) => string | undefined;
  /** Active members — the people a task can be assigned to. */
  membersOf: (workspaceId: string) => Member[];
  /** Any member by id, former ones included — for showing who a task is on. */
  memberOf: (workspaceId: string, memberId: string | null) => Member | undefined;
  /** Whether my access lets me change this task; the server refuses otherwise. */
  canEdit: (task: Task) => boolean;
}

/**
 * Lists a task can be created in: not archived, not inside an archived folder
 * (archiving a folder leaves its lists' own flag alone), and open to me for
 * editing — a read-only list answers a create with 403.
 */
export function writableLists(bundle: Pick<AvailableBundle, "lists" | "folders">): List[] {
  const folderOf = (id: string | undefined) => (id ? bundle.folders?.find((f) => f.id === id) : undefined);
  const inArchivedFolder = (folderId: string | undefined, seen = new Set<string>()): boolean => {
    const folder = folderOf(folderId);
    if (!folder || seen.has(folder.id)) return false;
    return folder.archived || inArchivedFolder(folder.folderId, seen.add(folder.id));
  };
  return bundle.lists.filter((l) => !l.archived && l.myAccess !== "read" && !inArchivedFolder(l.folderId));
}

/**
 * The lookups every command needs over the raw bundle.
 *
 * Built on the JS side, NEVER stored: `useCachedPromise` persists its result as
 * JSON, and functions do not survive that trip — a cached read would hand back
 * an object whose methods have quietly vanished. So the hook below caches the
 * plain data and rebuilds these on top of it.
 */
export function buildContext(bundle: AvailableBundle, me: User): HuleContext {
  const listOf = (listId: string) => bundle.lists.find((l) => l.id === listId);

  return {
    bundle,
    me,
    openLists: writableLists(bundle),
    listOf,
    workspaceOf: (listId) => {
      const list = listOf(listId);
      return list && bundle.workspaces.find((w) => w.id === list.workspaceId);
    },
    statusesOf: (listId) => {
      const templateId = listOf(listId)?.statusTemplateId;
      if (!templateId) return [];
      return bundle.statusTemplates.find((t) => t.id === templateId)?.statuses ?? [];
    },
    myMemberId: (workspaceId) => bundle.members.find((m) => m.workspaceId === workspaceId && m.userId === me.id)?.id,
    membersOf: (workspaceId) => bundle.members.filter((m) => m.workspaceId === workspaceId && m.status === "active"),
    memberOf: (workspaceId, memberId) =>
      memberId ? bundle.members.find((m) => m.workspaceId === workspaceId && m.id === memberId) : undefined,
    canEdit: (task) => (task.myAccess ?? listOf(task.listId)?.myAccess) !== "read",
  };
}

/**
 * Everything a command needs before it can show anything: the workspace bundle
 * and who you are. One request each, cached by Raycast between runs so the
 * second launch paints immediately.
 */
export function useHule() {
  const { data, isLoading, error, revalidate } = useCachedPromise(async () => {
    // Plain data only — see buildContext: the cache round-trips through JSON.
    const [bundle, me] = await Promise.all([getBundle(), getMe()]);
    return { bundle, me };
  }, []);

  const context = useMemo(() => (data ? buildContext(data.bundle, data.me) : undefined), [data]);

  return { data: context, isLoading, error, revalidate };
}
