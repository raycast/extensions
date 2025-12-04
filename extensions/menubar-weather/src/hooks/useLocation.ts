import { KLocation } from "../types/types";
import { getGeoLocation } from "../utils/weather-utils";
import { useCachedPromise } from "@raycast/utils";

export function useLocation() {
  return useCachedPromise(
    () => {
      return getGeoLocation() as Promise<KLocation>;
    },
    [],
    { keepPreviousData: true },
  );
}
