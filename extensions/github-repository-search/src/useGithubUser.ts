import { useCachedPromise } from "@raycast/utils";
import { fetchUserData } from "./github";

export function useUserData() {
  return useCachedPromise(fetchUserData);
}
