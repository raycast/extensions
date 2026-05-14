import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "../constants";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
  },
});
