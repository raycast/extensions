import { User } from "@supabase/supabase-js";
import { useCachedPromise } from "@raycast/utils";
import * as db from "./db";

export function useGroups(user: User) {
  const { data, isLoading, revalidate } = useCachedPromise(
    async (id) => {
      return await db.getGroups(id);
    },
    [user.id],
  );

  return { data: data?.data, error: data?.error, isLoading, revalidate };
}
