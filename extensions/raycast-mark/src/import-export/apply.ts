import { t } from "../i18n.ts";
import * as fs from "node:fs/promises";
import path from "node:path";
import {
  entityKey,
  invalid,
  LibraryError,
  validateBookmark,
} from "../model.ts";
import type { Bookmark, Mutation } from "../model.ts";
import { commit } from "../repository.ts";
import { materializeIcon } from "./icons.ts";
import type { ImportDecisions, ImportPlan } from "./types.ts";

export async function applyJsonImport(
  directory: string,
  plan: ImportPlan,
  decisions: ImportDecisions,
  options: { beforeCommit?: () => Promise<void> } = {},
) {
  for (const difference of plan.differences)
    if (!["local", "incoming"].includes(decisions[difference.entityKey]))
      invalid(t("请明确选择所有同 ID 差异"));
  const mutations: Mutation[] = [];
  let staging: string | undefined;
  let committing = false;
  try {
    for (const m of plan.mutations) {
      if (decisions[entityKey(m.entity, m.entityId)] === "local") continue;
      if (m.entity === "bookmark" && (m.value as Bookmark).icon && !m.removed) {
        staging ??= await fs.mkdtemp(path.join(directory, "icons", ".import-"));
        const bookmark = await materializeIcon(staging, m.value as Bookmark);
        mutations.push({ ...m, value: validateBookmark(bookmark) });
      } else {
        mutations.push(m);
      }
    }
    // Keeping a local catalog may invalidate incoming locations; repository rejects the entire transaction.
    await options.beforeCommit?.();
    committing = true;
    const result = await commit(directory, {
      mutations,
      expectedHeads: plan.expectedHeads,
      replaceUsage: plan.authoritative,
    });
    if (
      staging &&
      !mutations.some(
        (m) =>
          m.entity === "bookmark" &&
          (() => {
            const icon = (m.value as Bookmark).icon;
            return (
              icon?.path?.startsWith(`${staging}${path.sep}`) ||
              (icon?.type === "remote" &&
                icon.cache?.startsWith(`${staging}${path.sep}`))
            );
          })(),
      )
    )
      await fs.rm(staging, { recursive: true, force: true });
    return result;
  } catch (error) {
    // ponytail: Keep staged icons on ambiguous post-publication errors; reconcile them from events before automatic garbage collection.
    if (
      staging &&
      (!committing ||
        (error instanceof LibraryError &&
          ["STALE_HEADS", "CONFLICT", "LIMIT", "INVALID_INPUT"].includes(
            error.code,
          )))
    )
      await fs
        .rm(staging, { recursive: true, force: true })
        .catch(() => undefined);
    throw error;
  }
}
