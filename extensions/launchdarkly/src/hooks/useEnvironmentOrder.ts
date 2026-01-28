import { useEffect } from "react";
import { useCachedState } from "@raycast/utils";

const GLOBAL_ENVIRONMENT_ORDER_KEY = "GLOBAL_ENVIRONMENT_ORDER";

export function useEnvironmentOrder(currentEnvKeys: string[]) {
  const [environmentOrder, setEnvironmentOrder] = useCachedState<string[]>(GLOBAL_ENVIRONMENT_ORDER_KEY, []);

  useEffect(() => {
    if (currentEnvKeys.length > 0) {
      const validOrder = environmentOrder.filter((k) => currentEnvKeys.includes(k));
      const newEnvs = currentEnvKeys.filter((k) => !environmentOrder.includes(k));

      if (environmentOrder.length === 0) {
        setEnvironmentOrder([...currentEnvKeys]);
      } else if (newEnvs.length > 0 || validOrder.length !== environmentOrder.length) {
        setEnvironmentOrder([...validOrder, ...newEnvs]);
      }
    }
  }, [currentEnvKeys]);

  function moveEnvironment(envKey: string, direction: "up" | "down") {
    const currentOrder = environmentOrder.length > 0 ? environmentOrder : currentEnvKeys;
    const newOrder = [...currentOrder];
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
