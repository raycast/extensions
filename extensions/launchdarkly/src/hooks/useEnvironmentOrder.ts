import { useEffect } from "react";
import { useCachedState } from "@raycast/utils";

const GLOBAL_ENVIRONMENT_ORDER_KEY = "GLOBAL_ENVIRONMENT_ORDER";

export function useEnvironmentOrder(currentEnvKeys: string[]) {
  const [environmentOrder, setEnvironmentOrder] = useCachedState<string[]>(GLOBAL_ENVIRONMENT_ORDER_KEY, []);

  useEffect(() => {
    let changed = false;
    let newOrder = [...environmentOrder];

    currentEnvKeys.forEach((key) => {
      if (!newOrder.includes(key)) {
        newOrder.push(key);
        changed = true;
      }
    });

    const filtered = newOrder.filter((k) => currentEnvKeys.includes(k));
    if (filtered.length !== newOrder.length) {
      newOrder = filtered;
      changed = true;
    }

    if (changed) {
      setEnvironmentOrder(newOrder);
    }
  }, [currentEnvKeys]);

  function moveEnvironment(envKey: string, direction: "up" | "down") {
    const newOrder = [...environmentOrder];
    const currentIndex = newOrder.indexOf(envKey);
    if (currentIndex === -1) return;

    if (direction === "up" && currentIndex > 0) {
      [newOrder[currentIndex], newOrder[currentIndex - 1]] = [newOrder[currentIndex - 1], newOrder[currentIndex]];
    } else if (direction === "down" && currentIndex < newOrder.length - 1) {
      [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]];
    }
    setEnvironmentOrder(newOrder);
  }

  return { environmentOrder, moveEnvironment };
}
