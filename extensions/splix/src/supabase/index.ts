import { env } from "../env";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../types/supabase";

// Initialize Supabase client
export const supabase = createClient<Database>(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY);
