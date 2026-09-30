import useSWR from "swr";

// https://2020.paco.me/blog/shared-hook-state-with-swr
const useSharedState = <T>(key: string, initial?: T) => {
  const { data: state, mutate: setState } = useSWR<T>(key, {
    fallbackData: initial,
  });
  return [state, setState] as const;
};

export default useSharedState;
