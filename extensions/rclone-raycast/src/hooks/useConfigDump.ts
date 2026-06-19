import { useCachedPromise } from "@raycast/utils";
import { fetchConfigDump } from "../lib/api";

export default function useConfigDump() {
  return useCachedPromise(fetchConfigDump, [], { keepPreviousData: true });
}
