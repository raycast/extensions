import { SpaceClient } from "deta-space-client";
import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";
import type { CachedPromiseOptions } from "@raycast/utils";

const { spaceToken } = getPreferenceValues();
export const spaceCient = SpaceClient(spaceToken);

export function useSpace<T, U = undefined>(
  endpoint: string,
  options?: CachedPromiseOptions<(endpoint: string) => Promise<T>, U>
): UseCachedPromiseReturnType<Awaited<T>, U> {
  async function promise(endpoint: string): Promise<T> {
    return await spaceCient.get<T>(endpoint);
  }

  return useCachedPromise(promise, [endpoint], options);
}
