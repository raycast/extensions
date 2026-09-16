import { LocalStorage, PopToRootType, Toast, closeMainWindow, open, showToast } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useMemo } from "react";
import { Engine, getAllEngines } from "./engines";

const MULTI_SEARCH_ENABLED_KEY = "multi-search-enabled";
const MULTI_SEARCH_ENGINES_KEY = "multi-search-engines";
const DEFAULT_MULTI_ENGINES = ["google", "perplexity"];

export async function getStoredMultiSearchEnabled(): Promise<boolean> {
  const raw = await LocalStorage.getItem<boolean | string>(MULTI_SEARCH_ENABLED_KEY);
  if (typeof raw === "boolean") {
    return raw;
  }
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) === true;
    } catch {
      return raw === "true";
    }
  }
  return false;
}

export async function getStoredMultiSearchEngineIds(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(MULTI_SEARCH_ENGINES_KEY);
  if (typeof raw !== "string") {
    return DEFAULT_MULTI_ENGINES;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : DEFAULT_MULTI_ENGINES;
  } catch {
    return DEFAULT_MULTI_ENGINES;
  }
}

export async function getStoredMultiSearchEngines(availableEngines?: Engine[]): Promise<Engine[]> {
  const engines = availableEngines ?? (await getAllEngines());
  const ids = await getStoredMultiSearchEngineIds();
  return ids.map((id) => engines.find((e) => e.id === id)).filter((e): e is Engine => e !== undefined);
}

export async function executeMultiSearch(
  engines: Engine[],
  query: string,
  onSearch: (query: string) => Promise<void>,
): Promise<void> {
  await onSearch(query);
  for (const engine of engines) {
    await open(engine.searchUrl(query));
  }
  await closeMainWindow({ popToRootType: PopToRootType.Default });
}

export function useMultiSearch(availableEngines: Engine[]) {
  const {
    value: isEnabledVal,
    setValue: setIsEnabledVal,
    isLoading: isLoadingEnabled,
  } = useLocalStorage<boolean>(MULTI_SEARCH_ENABLED_KEY, false);

  const {
    value: engineIdsVal,
    setValue: setEngineIdsVal,
    isLoading: isLoadingIds,
  } = useLocalStorage<string[]>(MULTI_SEARCH_ENGINES_KEY, DEFAULT_MULTI_ENGINES);

  const isEnabled = isEnabledVal ?? false;
  const selectedEngineIds = engineIdsVal ?? DEFAULT_MULTI_ENGINES;

  const selectedEngines: Engine[] = useMemo(() => {
    return selectedEngineIds
      .map((id) => availableEngines.find((e) => e.id === id))
      .filter((e): e is Engine => e !== undefined);
  }, [selectedEngineIds, availableEngines]);

  async function toggleMultiSearch() {
    const next = !isEnabled;
    await setIsEnabledVal(next);
    await showToast({
      style: Toast.Style.Success,
      title: next ? "Multi-Search Enabled" : "Multi-Search Disabled",
      message: next ? `Will open ${selectedEngines.length} search engines` : "Will open default single engine",
    });
  }

  async function toggleEngine(id: string) {
    const next = selectedEngineIds.includes(id)
      ? selectedEngineIds.filter((item) => item !== id)
      : [...selectedEngineIds, id];
    await setEngineIdsVal(next);
  }

  async function moveEngine(id: string, direction: "up" | "down") {
    const index = selectedEngineIds.indexOf(id);
    if (index === -1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedEngineIds.length) return;

    const next = [...selectedEngineIds];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    await setEngineIdsVal(next);
  }

  return {
    isEnabled,
    toggleMultiSearch,
    setIsEnabled: setIsEnabledVal,
    selectedEngineIds,
    selectedEngines,
    toggleEngine,
    moveEngine,
    isLoading: isLoadingEnabled || isLoadingIds,
  };
}
