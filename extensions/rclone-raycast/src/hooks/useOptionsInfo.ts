import { useCachedPromise } from "@raycast/utils";
import { fetchOptionsInfo } from "../lib/api";

export default function useOptionsInfo() {
  return useCachedPromise(fetchOptionsInfo, [], {
    keepPreviousData: true,
  });
}
