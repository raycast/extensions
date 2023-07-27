import { getPreferenceValues } from "@raycast/api";
import { sleep } from "../../utils";
import { State } from "../../haapi";

/**
 * Sleep to get state changes
 */
export async function stateChangeSleep() {
  await sleep(1000);
}

export function hiddenEntitiesPreferences(): string[] {
  const prefs = getPreferenceValues();
  const hidden: string | undefined = prefs.excludedEntities;
  if (!hidden) {
    return [];
  }
  return (hidden.split(",").map((h) => h.trim()) || []).filter((h) => h.length > 0);
}

function wildcardFilter(filter: string, text: string) {
  const r = new RegExp("^" + filter.replace(/\*/g, ".*") + "$").test(text);
  return r;
}

function wildcardFilters(filters: string[], text: string) {
  for (const f of filters) {
    const r = wildcardFilter(f, text);
    if (r) {
      return true;
    }
  }
  return false;
}

export function filterStates(states: State[] | undefined, options?: { include?: string[]; exclude?: string[] }) {
  if (!states) {
    return states;
  }
  let result = states;
  const inc = options?.include;
  if (inc && inc.length > 0) {
    result = result.filter((s) => wildcardFilters(inc, s.entity_id));
  }
  const ex = options?.exclude;
  if (ex && ex.length > 0) {
    result = result.filter((s) => !wildcardFilters(ex, s.entity_id));
  }
  return result;
}
