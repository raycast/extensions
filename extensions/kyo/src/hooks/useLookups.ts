import { useCachedPromise } from "@raycast/utils";
import {
  Companies,
  People,
  Pipelines,
  PipelineStages,
  Projects,
  Spaces,
  Labels,
} from "../api/resources";

/**
 * Cached lookups used to populate form dropdowns and to resolve foreign-key ids
 * into human names in lists/details. useCachedPromise renders cached data
 * instantly, then revalidates.
 */

export function usePipelines() {
  return useCachedPromise(async () => Pipelines.list(), [], {
    initialData: [],
  });
}

export function usePipelineStages(pipelineId?: string) {
  return useCachedPromise(
    async (id?: string) =>
      id ? PipelineStages.list({ pipeline_id: id }) : PipelineStages.list(),
    [pipelineId],
    { initialData: [] },
  );
}

export function useSpaces() {
  return useCachedPromise(async () => Spaces.list(), [], { initialData: [] });
}

export function useProjects(spaceId?: string) {
  return useCachedPromise(
    async (id?: string) =>
      id ? Projects.list({ space_id: id }) : Projects.list(),
    [spaceId],
    { initialData: [] },
  );
}

export function useCompanies() {
  return useCachedPromise(async () => Companies.list(), [], {
    initialData: [],
  });
}

export function usePeople() {
  return useCachedPromise(async () => People.list(), [], { initialData: [] });
}

export function useLabels() {
  return useCachedPromise(async () => Labels.list(), [], { initialData: [] });
}
