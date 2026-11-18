import { open, showToast, Toast } from "@raycast/api";
import { isSignedIn, signIn } from "./jovida";
import { JovidaError } from "./types";

// Ensure the user is signed in, running the device-flow where the extension runs.
// Shows progress via a toast and opens the approval URL in the browser.
export async function ensureSignedIn(): Promise<boolean> {
  if (await isSignedIn()) return true;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Signing in to Jovida…",
  });
  try {
    await signIn(async (url) => {
      await open(url);
      toast.message = "Approve sign-in in your browser, then come back";
    });
    toast.style = Toast.Style.Success;
    toast.title = "Signed in to Jovida";
    toast.message = undefined;
    return true;
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Sign-in failed";
    toast.message = e instanceof Error ? e.message : String(e);
    return false;
  }
}

// Run an action; if it fails because the user isn't signed in, run the sign-in
// flow and retry once. Lets UI render immediately without a blocking auth gate.
export async function withSignIn<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof JovidaError && e.code === "NOT_SIGNED_IN") {
      if (await ensureSignedIn()) return await fn();
    }
    throw e;
  }
}
