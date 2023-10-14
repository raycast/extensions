import { Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import fetch from "cross-fetch";

import { VaultCredential } from "../types/dcli";

export function useItemIcon(item: VaultCredential) {
  const { data } = useCachedPromise(
    async (url) => {
      try {
        const imageUrl = getImageUrl(url);
        const exists = await imageExists(imageUrl);
        return exists ? imageUrl : Icon.QuestionMark;
      } catch (error) {
        return Icon.QuestionMark;
      }
    },
    [item.url]
  );
  return data;
}

function getImageUrl(itemUrl: string) {
  const url = new URL(itemUrl);
  const name = url.hostname.split(".").slice(-2).join("_");
  return `https://d2erpoudwvue5y.cloudfront.net/_160x106/${name}@2x.png`;
}

async function imageExists(imageUrl: string): Promise<boolean> {
  const { ok } = await fetch(imageUrl, { method: "GET" });
  return ok;
}
