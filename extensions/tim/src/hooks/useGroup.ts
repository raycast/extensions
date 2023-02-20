import { useData } from "../state/data";
import { UUID } from "../types/tim";

export function useGroup(id: UUID) {
  const { data, isLoading, error } = useData();

  const group = data?.groups[id];
  const tasks = data?.nodes.filter((node) => node.parent === id);

  return {
    isLoading,
    error,
    group,
    tasks,
  };
}
