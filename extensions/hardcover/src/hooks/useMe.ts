import { useCachedPromise } from "@raycast/utils";
import { getMe } from "../api/me";

export default function useMe() {
  const { data, isLoading } = useCachedPromise(() => getMe());

  return { me: data, isMeLoading: isLoading };
}
