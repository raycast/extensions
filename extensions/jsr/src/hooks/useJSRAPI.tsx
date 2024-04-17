import { useFetch } from "@raycast/utils";

import type { Package, SearchResultDocument } from "@/types";

const useJSRAPI = (item: SearchResultDocument) => {
  const url = `https://api.jsr.io/scopes/${item.scope}/packages/${item.name}`;
  return useFetch<Package>(url);
};

export default useJSRAPI;
