import { useMemo, useRef } from "react";
import { useCachedPromise } from "@raycast/utils";
import fetch from "node-fetch";

import { WEBSITE } from "@/utils";

import type { Doc } from "@/type";

const filterContent = (res: string): string => {
  let content = res;

  content = content.replace(/\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)/gim, (match, altText, imageUrl, linkUrl) => {
    const newImageUrl = imageUrl.replace("images/", `${WEBSITE}/images/`);
    const newLinkUrl = linkUrl.replace("images/", `${WEBSITE}/images/`);
    return `[![${altText}](${newImageUrl})](${newLinkUrl})`;
  });

  // Find all links and replace the href with the full url
  content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, (match, text, href) => {
    if (href.startsWith("http")) {
      return match;
    }
    return `[${text}](${href})`;
  });

  return content;
};

export const useDetails = (doc: Doc) => {
  const abortable = useRef<AbortController>();
  const { isLoading, data, revalidate, error } = useCachedPromise(
    async (url: string) => {
      const response = await fetch(url, { signal: abortable.current?.signal });

      if (response.status !== 200) {
        throw new Error(`${response.status} - ${response.statusText}`);
      }

      const res = await response.text();

      const content = filterContent(res);

      return content;
    },
    [`${WEBSITE}/${doc.filePath}.md`],
    {
      keepPreviousData: true,
      abortable,
    },
  );

  const content = useMemo(() => {
    return data || "";
  }, [data]);

  return { isLoading, content, revalidate, error };
};
