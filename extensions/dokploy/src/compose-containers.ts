import { useFetch } from "@raycast/utils";
import { ErrorResult } from "./interfaces";

/** A compose stack's `loadServices` response isn't documented anywhere - handled defensively. */
export function parseContainerNames(data: unknown): string[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const { name, serviceName } = item as { name?: string; serviceName?: string };
        return name ?? serviceName ?? null;
      }
      return null;
    })
    .filter((name): name is string => Boolean(name));
}

/** The container/service names defined in one compose stack, for any picker that needs to target one. */
export function useComposeContainers(
  url: string,
  headers: Record<string, string>,
  composeId: string,
  execute: boolean,
) {
  const {
    data: containers,
    isLoading: containersLoading,
    error: containersError,
    revalidate: retryContainers,
  } = useFetch<string[], string[]>(`${url}compose.loadServices?composeId=${composeId}&type=fetch`, {
    headers,
    initialData: [],
    execute,
    parseResponse: async (response) => {
      if (!response.ok) {
        const err = (await response.json()) as ErrorResult;
        throw new Error(err.message);
      }
      return parseContainerNames(await response.json());
    },
  });

  return { containers, containersLoading, containersError, retryContainers };
}
