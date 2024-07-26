import { Timezone } from "../types/types";
import { getStarredTimezones } from "../utils/common-utils";
import { useCachedPromise } from "@raycast/utils";

export function useStarTimezones() {
  return useCachedPromise(() => {
    return getStarredTimezones() as Promise<Timezone[]>;
  });
}
