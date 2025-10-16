import useSWR, { type KeyedMutator } from 'swr';

export function useSharedState<T>(key: string, initial: T): [T | undefined, KeyedMutator<T>] {
  const { data: state = initial, mutate: setState } = useSWR<T>(key, null, {
    fallbackData: initial,
    refreshInterval: 0,
    revalidateIfStale: false,
  });
  return [state, setState];
}
