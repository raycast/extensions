import React from "react";
import { User } from "@supabase/supabase-js";
import { showHUD } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import * as db from "./db";

export function useGroups(user: User) {
  const [groups, setGroups] = useCachedState<Omit<db.Group, "user_id">[]>("groups", []);

  React.useEffect(() => {
    (async () => {
      const { data, error } = await db.getGroups(user.id);

      if (error) {
        showHUD(error.message);
        return;
      }

      if (data) {
        setGroups(data);
      }
    })();
  }, []);

  return groups;
}
