import { useCachedState } from "@raycast/utils";
import { ISyncData } from "@src/interface";

export default function useCachedData() {
  return useCachedState<ISyncData>("data");
}
