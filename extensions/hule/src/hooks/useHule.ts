import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { getBundle, getMe } from "../api/client";
import type { AvailableBundle, List, Member, TemplateStatus, User, Workspace } from "../api/types";

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
  membersOf: (workspaceId: string) => Member[];
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
    openLists: bundle.lists.filter((l) => !l.archived),
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
