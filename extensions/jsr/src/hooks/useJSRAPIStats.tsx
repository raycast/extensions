// https://api.jsr.io/stats

import { useFetch } from "@raycast/utils";
import { Package } from "../lib/types";

const useJSRAPIStats = () => {
  const url = `https://api.jsr.io/stats`;
  return useFetch<{
    newest: Array<Package>;
    featured: Array<Package>;
  }>(url);
};

export default useJSRAPIStats;
