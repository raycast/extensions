import { useCachedPromise } from "@raycast/utils";
import { authorize } from "./supabase";

export function useAuth() {
  const { data, isLoading } = useCachedPromise(async () => {
    return await authorize();
  });

  return { data: data?.user, error: data?.error, isLoading };
}
