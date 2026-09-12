import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";

/**
 * Requests a one-time login code to be emailed to the given address.
 *
 * Works for both new and returning users: an unknown email creates the account,
 * a known email signs in.
 *
 * @param email - Inoh account email to send the code to
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
