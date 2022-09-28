import { useCachedPromise } from "@raycast/utils";
import { getMe } from "../api/users";

export function useMe() {
  return useCachedPromise(getMe);
}
