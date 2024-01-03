import * as React from "react";
import { showHUD } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import * as db from "./db";
import { supabase } from "./supabase";

export function useGroups() {
  const [groups, setGroups] = useCachedState<Omit<db.Group, "user_id">[]>("groups", []);

  React.useEffect(() => {
    (async () => {
      const userRes = await supabase.auth.getUser();

      if (!userRes.data.user) {
        return;
      }

      const { data, error } = await db.getGroups(userRes.data.user.id);

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
