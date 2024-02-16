import React from "react";
import { User } from "@supabase/supabase-js";
import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import { supabase } from "./supabase";

export function useAuth() {
  const [error, setError] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    async function init() {
      const preferences = getPreferenceValues<Preferences>();

      const { error, data } = await supabase.auth.signInWithPassword({
        email: preferences.email,
        password: preferences.password,
      });

      if (error) {
        setError(error.message);
        await showToast({
          title: "Error",
          message: error.message,
          style: Toast.Style.Failure,
        });
        return;
      }

      if (data?.user) {
        setUser(data.user);
        return;
      }
    }

    init();
  }, []);

  return { user, error };
}

interface Preferences {
  email: string;
  password: string;
}
