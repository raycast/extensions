import { supabase } from "./supabase";

/**
 * Signs in with email/password and returns the authenticated user.
 *
 * @param email - Joey account email
 * @param password - Joey account password
 * @returns Authenticated user object
 * @throws {Error} When credentials are invalid or sign-in fails
 */
export async function signIn(email: string, password: string) {
  const { data: session, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return session.user;
}
