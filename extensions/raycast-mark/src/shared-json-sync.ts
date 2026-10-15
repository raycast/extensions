import { t } from "./i18n.ts";
import { bookmarkMutation, canonical, catalogMutation } from "./model.ts";
import type { LibraryState, Mutation } from "./model.ts";
import { readLibrary } from "./repository.ts";
import { applyJsonImport, previewJsonImport } from "./import-export.ts";
import type { ImportPlan } from "./import-export.ts";
import {
  readSharedSource,
  localLibrarySnapshot,
  portableLibrary,
  setSharedJsonSource,
  sharedJsonBaseline,
  sharedJsonDigest,
  sharedJsonPath,
  updateSharedJsonBaseline,
  validateSharedIconData,
  pauseSharedJson,
  sharedJsonPaused,
  clearSharedJsonPause,
  withExternalSharedJson,
} from "./shared-json-storage.ts";

export function authoritativePlan(
  plan: ImportPlan,
  state: LibraryState,
): ImportPlan {
  const mutations: Mutation[] = [];
  if (canonical(plan.data.catalog) !== canonical(state.catalog))
    mutations.push(catalogMutation(state, plan.data.catalog));
  const incomingIds = new Set(
    plan.data.bookmarks.map((bookmark) => bookmark.id),
  );
  for (const incoming of plan.data.bookmarks) {
    const current = state.bookmarks.find(
      (bookmark) => bookmark.id === incoming.id,
    );
    if (canonical(current) === canonical(incoming)) continue;
    mutations.push({
      ...bookmarkMutation(state, incoming),
      value: incoming,
      coveredVisits: state.visitEventIds?.[incoming.id] ?? [],
    });
  }
  for (const bookmark of state.bookmarks) {
    if (incomingIds.has(bookmark.id)) continue;
    mutations.push({
      ...bookmarkMutation(state, bookmark),
      value: bookmark,
      coveredVisits: state.visitEventIds?.[bookmark.id] ?? [],
      removed: true,
    });
  }
  const differences = mutations.flatMap((mutation) => {
    const local =
      mutation.entity === "catalog"
        ? state.catalog
        : state.bookmarks.find((bookmark) => bookmark.id === mutation.entityId);
    return local && !mutation.removed
      ? [
          {
            entityKey: `${mutation.entity}:${mutation.entityId}`,
            local,
            incoming: mutation.value,
          },
        ]
      : [];
  });
  return { ...plan, differences, mutations, authoritative: true };
}

export function previewSharedJson(
  raw: string,
  state: LibraryState,
  folder = false,
) {
  const plan = previewJsonImport(raw, state, { shared: true, folder });
  for (const bookmark of plan.data.bookmarks) {
    const icon = bookmark.icon;
    if (icon?.type === "custom")
      validateSharedIconData(icon.data!, bookmark.title);
    if (icon?.type === "remote" && icon.cache?.startsWith("data:image/"))
      validateSharedIconData(icon.cache, bookmark.title);
  }
  return authoritativePlan(plan, state);
}

async function applySource(
  root: string,
  raw: string,
  state: LibraryState,
  folder = false,
  beforeCommit?: () => Promise<void>,
) {
  const plan = previewSharedJson(raw, state, folder);
  const decisions = Object.fromEntries(
    plan.differences.map((difference) => [
      difference.entityKey,
      "incoming" as const,
    ]),
  );
  return plan.mutations.length
    ? applyJsonImport(root, plan, decisions, { beforeCommit })
    : { state, warning: undefined };
}

/** UI confirms replacement before calling this operation. Never writes the source on connect. */
export async function connectSharedJson(
  root: string,
  file: string,
  state: LibraryState,
  expectedRaw?: string,
) {
  return withExternalSharedJson(async () => {
    const apply = async () => {
      const source = await readSharedSource(file);
      if (expectedRaw !== undefined && source.raw !== expectedRaw)
        throw new Error(t("数据已变化，请重新打开表单或预览"));
      if (canonical(state) !== canonical(await readLibrary(root)))
        throw new Error(t("数据已变化，请重新打开表单或预览"));
      let latest = source.raw;
      const result = await applySource(
        root,
        source.text,
        state,
        true,
        async () => {
          latest = (await readSharedSource(file)).raw;
          if (latest !== source.raw)
            throw new Error(t("数据已变化，请重新打开表单或预览"));
        },
      );
      latest = (await readSharedSource(file)).raw;
      if (latest !== source.raw) {
        await pauseSharedJson(t("本地已应用，源连接未完成；请重新连接"));
        return {
          ...result,
          warning: t("本地已应用，源连接未完成；请重新连接"),
          sharedSyncPaused: true,
        };
      }
      try {
        await setSharedJsonSource(
          file,
          source.raw,
          await localLibrarySnapshot(root, result.state),
        );
        await clearSharedJsonPause();
      } catch (error) {
        await pauseSharedJson(t("本地已应用，源连接未完成；请重新连接")).catch(
          () => undefined,
        );
        return {
          ...result,
          warning: t`本地已应用，源连接未完成；请重新连接：${error instanceof Error ? error.message : t("未知错误")}`,
          sharedSyncPaused: true,
        };
      }
      return result;
    };
    return portableLibrary.withLock(file, apply);
  });
}

export async function refreshSharedJson(root: string, state: LibraryState) {
  return withExternalSharedJson(async () => {
    const file = await sharedJsonPath();
    if (!file) return state;
    const refresh = async () => {
      if (await sharedJsonPaused()) return state;
      const current = await readLibrary(root);
      const source = await readSharedSource(file);
      const raw = source.raw;
      const baseline = await sharedJsonBaseline();
      if (!baseline.remote || !baseline.local)
        throw new Error(t("共享 JSON 基线缺失；为避免覆盖，请重新连接文件"));
      const local = await localLibrarySnapshot(root, current);
      if (sharedJsonDigest(raw) === baseline.remote) {
        if (sharedJsonDigest(local) !== baseline.local)
          throw new Error(
            t("本地库有尚未写入共享 JSON 的变更；请先导出备份，再重新连接文件"),
          );
        return canonical(current) === canonical(state) ? state : current;
      }
      if (sharedJsonDigest(local) !== baseline.local)
        throw new Error(
          t("共享文件与本地库均有变化；检测到冲突，已阻断同步和写入"),
        );
      let latest = raw;
      const result = await applySource(
        root,
        source.text,
        current,
        true,
        async () => {
          latest = (await readSharedSource(file)).raw;
          if (latest !== raw)
            throw new Error(t("数据已变化，请重新打开表单或预览"));
        },
      );
      latest = (await readSharedSource(file)).raw;
      if (latest !== raw) {
        await pauseSharedJson(t("本地已应用，源连接未完成；请重新连接"));
        return result.state;
      }
      try {
        const nextLocal = await localLibrarySnapshot(root, result.state);
        await updateSharedJsonBaseline(raw, nextLocal);
        await clearSharedJsonPause();
      } catch {
        await pauseSharedJson(t("本地已应用，源连接未完成；请重新连接")).catch(
          () => undefined,
        );
      }
      return result.state;
    };
    return portableLibrary.withLock(file, refresh);
  });
}
