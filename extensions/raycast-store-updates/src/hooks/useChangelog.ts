import { useCachedPromise } from "@raycast/utils";

const RAW_CONTENT_BASE = "https://raw.githubusercontent.com/raycast/extensions/main/extensions";

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
