import { getRoadmaps } from "../api/getProjects";
import { useCachedPromise } from "@raycast/utils";

export default function useRoadmaps() {
  const { data, isLoading } = useCachedPromise(getRoadmaps);

  return {
    roadmaps: data,
    isLoadingRoadmaps: isLoading,
  };
}
