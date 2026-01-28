import useSWR from "swr";

export function useCheckDetail<T>({
  keyPrefix,
  url,
  fetcher,
  enabled,
}: {
  keyPrefix: string;
  url: string;
  fetcher: (url: string) => Promise<T>;
  enabled: boolean;
}) {
  return useSWR([keyPrefix, url], ([, url]) => fetcher(url), {
    isPaused() {
      return enabled;
    },
  });
}
