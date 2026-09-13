import { useCachedPromise } from "@raycast/utils";
import { listAgents, listPresets, listSkills, listTags, SkillFilter } from "../lib/api";

/**
 * Cached reads of the library.
 *
 * `useCachedPromise` paints the last known result immediately and revalidates
 * behind it, which matters here because every read spawns a process. The CLI
 * shares its SQLite database with the desktop app, so a stale frame is only ever
 * a frame old — mutations revalidate explicitly.
 */

export function useSkills(filter: SkillFilter = {}) {
  return useCachedPromise((current: SkillFilter) => listSkills(current), [filter], {
    keepPreviousData: true,
    failureToastOptions: { title: "Could not load skills" },
  });
}

export function useAgents() {
  return useCachedPromise(listAgents, [], {
    keepPreviousData: true,
    failureToastOptions: { title: "Could not load agents" },
  });
}

export function usePresets() {
  return useCachedPromise(listPresets, [], {
    keepPreviousData: true,
    failureToastOptions: { title: "Could not load presets" },
  });
}

export function useTags() {
  return useCachedPromise(listTags, [], {
    keepPreviousData: true,
    // Tags only drive an optional filter; a failure here should not raise a toast
    // over whatever the user is actually doing.
    onError: () => undefined,
  });
}
