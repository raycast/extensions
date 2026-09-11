import { isSignedIn } from "./jovida";

export const NOT_SIGNED_IN =
  "The user is not signed in to Jovida. Ask them to open the “My Todos” command in Raycast once to sign in (it runs the browser approval flow), then try again.";

// Run at the start of every tool: sign-in check.
// Returns null when signed in, or a message string to hand back to the AI.
export async function toolPreflight(): Promise<string | null> {
  if (!(await isSignedIn())) return NOT_SIGNED_IN;
  return null;
}
