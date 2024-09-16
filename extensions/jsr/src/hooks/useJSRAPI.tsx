import { useFetch } from "@raycast/utils";

import type { Package } from "@/types";

const useJSRAPI = (item: { scope: string; name: string } | null) => {
  const url = `https://api.jsr.io/scopes/${item?.scope}/packages/${item?.name}`;
  return useFetch<Package>(url, { execute: !!item });
};

export default useJSRAPI;
