import { createClient } from "@supabase/supabase-js";

// Shared Supabase instance for all users
// The anon key is safe to expose publicly when RLS is enabled
const SUPABASE_URL = "https://jmlflqkeqlwjmgzxmbne.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_PjZFwzTWxlM3oy6ACxTBAg_kfAOuuwy";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface Poll {
  poll_date: string;
  question: string;
  options: string[];
  created_at: string;
}

export interface Vote {
  poll_date: string;
  user_hash: string;
  option_index: number;
  created_at: string;
}

export interface PollWithResults extends Poll {
  counts: number[];
  hasVoted: boolean;
  userVoteIndex: number | null;
}
