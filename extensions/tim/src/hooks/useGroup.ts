import { useData } from "../state/data";
import { UUID } from "../types/tim";

export function useGroup(id: UUID, tagFilter?: UUID) {
  const { data, isLoading, error } = useData();

  const group = data?.groups[id];
  const tasks = data?.nodes.filter((node) => {
    if (node.parent !== id) return false;

    const task = data.tasks[node.id];
    if (!task) return false;

    if (tagFilter) return task.tags?.includes(tagFilter);

    return true;
  });

  return {
    isLoading,
    error,
    group,
    tasks,
  };
}
