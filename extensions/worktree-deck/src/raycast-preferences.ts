import { getPreferenceValues } from "@raycast/api";

/**
 * Raycast Preferences で設定する worktree-deck の実行設定
 */
export type WorktreeDeckPreferenceValues = {
  GIT_WORKTREE_PATH?: string;
  CODEX_HOME?: string;
  WORKTREE_DECK_SEARCH_DAYS?: string;
  WORKTREE_DECK_DONE_THRESHOLD_DAYS?: string;
};

/**
 * Raycast Preferences を process.env 互換の辞書へ変換する
 */
export function buildPreferenceEnv(preferences: WorktreeDeckPreferenceValues): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(preferences)
      .map(([key, value]) => [key, typeof value === "string" ? value.trim() : ""] as const)
      .filter(([, value]) => value.length > 0),
  );
}

/**
 * Raycast Preferences を既存 infrastructure が読める process.env へ反映する
 */
export function applyRaycastPreferencesToProcessEnv(): NodeJS.ProcessEnv {
  const preferenceEnv = buildPreferenceEnv(getPreferenceValues<WorktreeDeckPreferenceValues>());
  Object.assign(process.env, preferenceEnv);
  return process.env;
}
