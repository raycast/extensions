import { Action, Icon, Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { personalToken } from "../lib/auth";
import { signInAgain } from "../lib/socialfaktory";

export function SignInAgainAction({ onSignedIn }: { onSignedIn?: () => void }) {
  if (personalToken()) return null;

  async function start() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Signing in to SocialFaktory" });
    try {
      await signInAgain();
      toast.style = Toast.Style.Success;
      toast.title = "Signed in to SocialFaktory";
      onSignedIn?.();
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "Could not sign in" });
    }
  }

  return <Action title="Sign in Again" icon={Icon.Person} onAction={start} />;
}
