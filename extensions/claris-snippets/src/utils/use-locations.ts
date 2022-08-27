import { useCachedState } from "@raycast/utils";
import { Location } from "./types";

export function useLocations() {
  return useCachedState<Location[]>("locations", []);
}
