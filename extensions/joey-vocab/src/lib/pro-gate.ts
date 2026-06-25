import { supabase } from "./supabase";

/**
 * Checks if the user has an active Joey Pro subscription.
 * A user can read their own `subscriptions` row via RLS; Pro means the row
 * has `plan === "pro"` and `status === "active"`.
 *
 * @param userId - User ID to check
 * @returns Whether the user has Pro access
 */
export async function isProUser(userId: string): Promise<boolean> {
  if (!userId) return false;

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .maybeSingle();

  // Reason: on a transient read error, fail closed (treat as free) rather than
  // granting Pro. The 300-card limit is also enforced server-side, so a false
  // negative only over-shows the upsell — it never lets a free user exceed the cap.
  if (error || !subscription) return false;

  return subscription.plan === "pro" && subscription.status === "active";
}
