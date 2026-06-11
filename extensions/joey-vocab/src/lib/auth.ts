import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";

// A new account's `created_at` is stamped when the code is *requested*, while
// `last_sign_in_at` is stamped when the code is *verified*. The gap is therefore
// the user's code-entry time (seconds to a couple of minutes), so the window
// must be generous enough to cover a slow code entry. A returning user's
// `created_at` is from an earlier session, so their gap is far larger.
//
// Reason: the only downside of too wide a window is a user who signs out and
// back in within it re-seeing the (non-destructive) install nudge; too narrow a
// window makes new users miss the nudge entirely, which defeats the feature.
const NEW_USER_GAP_MS = 10 * 60 * 1000;

/**
 * Requests a one-time login code to be emailed to the given address.
 *
 * Works for both new and returning users: an unknown email creates the account,
 * a known email signs in. The two cases are told apart after verification via
 * {@link isNewlyCreatedUser}, so the caller never has to ask the user up front.
 *
 * @param email - Joey account email to send the code to
 * @throws {Error} When the code could not be sent
 */
export async function requestEmailCode(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Determines whether a verified user was just created by this sign-in, rather
 * than an existing user signing back in.
 *
 * @param user - User returned from {@link verifyEmailCode}
 * @returns True when the account was created during this verification
 */
export function isNewlyCreatedUser(user: User): boolean {
  if (!user.created_at || !user.last_sign_in_at) {
    return false;
  }

  const createdAt = new Date(user.created_at).getTime();
  const lastSignInAt = new Date(user.last_sign_in_at).getTime();

  return Math.abs(lastSignInAt - createdAt) <= NEW_USER_GAP_MS;
}

/**
 * Verifies the emailed one-time code and returns the authenticated user.
 *
 * @param email - Email the code was sent to
 * @param code - Six-digit code from the email
 * @returns Authenticated user object
 * @throws {Error} When the code is invalid, expired, or verification fails
 */
export async function verifyEmailCode(email: string, code: string): Promise<User> {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("Verification succeeded but no user was returned.");
  }

  return data.user;
}

/**
 * Signs the current user out and clears the persisted session.
 *
 * @throws {Error} When sign-out fails
 */
export async function signOutUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}
