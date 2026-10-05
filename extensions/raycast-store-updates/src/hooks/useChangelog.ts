import { useCachedPromise } from "@raycast/utils";
import { RAW_CONTENT_BASE } from "../utils";

export function useChangelog(slug: string | undefined) {
  const url = slug ? `${RAW_CONTENT_BASE}/${slug}/CHANGELOG.md` : undefined;

  return useCachedPromise(
    async (fetchUrl: string) => {
      const response = await fetch(fetchUrl);
      if (!response.ok) return null;
      return response.text();
    },
    [url!],
    {
      execute: !!url,
    },
  );
}
