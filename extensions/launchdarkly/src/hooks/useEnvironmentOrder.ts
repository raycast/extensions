import { useCachedState } from "@raycast/utils";
import { useMemo } from "react";
import { sortEnvironmentKeys } from "../utils/environments";

const GLOBAL_ENVIRONMENT_ORDER_KEY = "GLOBAL_ENVIRONMENT_ORDER";

/**
 * User-defined environment order, persisted across flags. The effective order is
 * derived on every render (saved order first, then any unseen environments), so
 * nothing needs to be synced back with an effect.
 */
export function useEnvironmentOrder(currentEnvKeys: string[]) {
  const [savedOrder, setSavedOrder] = useCachedState<string[]>(GLOBAL_ENVIRONMENT_ORDER_KEY, []);

  const environmentOrder = useMemo(
    () => sortEnvironmentKeys(currentEnvKeys, savedOrder),
    [currentEnvKeys.join("|"), savedOrder.join("|")],
  );

  function moveEnvironment(envKey: string, direction: "up" | "down") {
    const next = [...environmentOrder];
    const index = next.indexOf(envKey);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setSavedOrder(next);
  }

  return { environmentOrder, moveEnvironment };
}
