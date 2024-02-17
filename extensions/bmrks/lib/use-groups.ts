import React from "react";
import { User } from "@supabase/supabase-js";
import { showHUD } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import * as db from "./db";

export function useGroups(user: User) {
  const [groups, setGroups] = useCachedState<Omit<db.Group, "user_id">[]>("groups", []);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      const { data, error } = await db.getGroups(user.id);
      setIsLoading(false);
      if (error) {
        showHUD(error.message);
        return;
      }

      if (data) {
        setGroups(data);
      }
    })();
  }, []);

  return { data: groups, isLoading };
}
