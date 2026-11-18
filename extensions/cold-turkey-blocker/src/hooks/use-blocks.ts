import { useCachedPromise } from "@raycast/utils";
import { listBlocksWithStatus } from "../lib/cold-turkey";

const CACHE_SCHEMA = "cold-turkey-4.9-v2";

async function loadBlocksWithStatus(schema: string) {
  void schema;
  return listBlocksWithStatus();
}

export function useBlocksWithStatus() {
  return useCachedPromise(loadBlocksWithStatus, [CACHE_SCHEMA], {
    initialData: [],
    failureToastOptions: {
      title: "Could not load Cold Turkey blocks",
    },
  });
}
