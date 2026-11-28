import { CachedPromiseOptions, useCachedPromise, useCachedState } from "@raycast/utils";

import { getJiraCacheKey } from "../api/jiraCredentials";

export function useJiraCachedPromise<Args extends unknown[], Value, InitialData = undefined>(
  fn: (...args: Args) => Promise<Value>,
  args: [...Args],
  options?: CachedPromiseOptions<(...args: Args) => Promise<Value>, InitialData>,
) {
  const { onWillExecute, ...cacheOptions } = options ?? {};
  const input = { accountKey: getJiraCacheKey(), functionKey: fn.toString(), args };

  return useCachedPromise(
    async (input: { accountKey: string; functionKey: string; args: Args }) => fn(...input.args),
    [input],
    {
      ...cacheOptions,
      onWillExecute: onWillExecute ? ([input]) => onWillExecute(input.args) : undefined,
    },
  );
}

export function useJiraCachedState<T = undefined>(key: string) {
  return useCachedState<T>(`${getJiraCacheKey()}:${key}`);
}
