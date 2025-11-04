import { useEffect, useState } from "react";
import { fetchInstances } from "./api";

export type Instance = {
  id: string;
  name: string;
  connectionStatus: string;
};

export function useInstances(enabled = true) {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    async function loadInstances() {
      setIsLoading(true);
      try {
        const data = (await fetchInstances()) as unknown;
        let list: Instance[] = [];

        if (Array.isArray(data)) {
          list = data
            .map((item: unknown) => {
              if (item && typeof item === "object" && "name" in item && "id" in item) {
                const inst = item as Instance;
                return { id: inst.id, name: inst.name, connectionStatus: inst.connectionStatus };
              }
              return null;
            })
            .filter((inst): inst is Instance => inst !== null);
        }

        setInstances(list);
      } catch (e) {
        console.error("Failed to load instances:", e);
        setInstances([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadInstances();
  }, [enabled]);

  return { instances, isLoading };
}
