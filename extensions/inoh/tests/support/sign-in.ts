import type { ReactElement } from "react";
import type { User } from "@supabase/supabase-js";
import { act } from "react-test-renderer";
import { navigation } from "./raycast";

export const SIGNED_IN_USER = { id: "signed-in-user" } as User;
type SignInElement = ReactElement<{ onAuthenticated: (user: User) => Promise<void> }>;

/** Completes the most recently pushed sign-in screen using the fixture account. */
export async function finishLatestSignIn() {
  const signIn = navigation.push.mock.calls.at(-1)![0] as SignInElement;
  await act(async () => {
    await signIn.props.onAuthenticated(SIGNED_IN_USER);
  });
}
