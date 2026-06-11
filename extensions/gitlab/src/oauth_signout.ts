import { showHUD } from "@raycast/api";
import { logout } from "./oauth";
import { isOAuthEnabled } from "./preferences";

// Clears the cached OAuth token so the next command triggers a fresh PKCE
// flow. In PAT mode there is nothing to clear, so we tell the user instead
// of silently no-op'ing.
export default async function SignOut(): Promise<void> {
  if (!isOAuthEnabled()) {
    await showHUD("Sign out has no effect: extension is configured for Personal Access Token");
    return;
  }
  await logout();
  await showHUD("Signed out of GitLab");
}
