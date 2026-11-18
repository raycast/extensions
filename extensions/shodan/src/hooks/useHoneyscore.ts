import { usePromise } from "@raycast/utils";
import { shodanClient } from "../api/client";

interface UseHoneyscoreOptions {
  ip: string;
  enabled?: boolean;
}

export function useHoneyscore({ ip, enabled = true }: UseHoneyscoreOptions) {
  const { data, isLoading, error, revalidate } = usePromise(
    async (ipAddress: string) => {
      return await shodanClient.getHoneyscore(ipAddress);
    },
    [ip],
    {
      execute: enabled && ip.length > 0,
    },
  );

  return {
    score: data ?? null,
    isLoading,
    error,
    revalidate,
  };
}
