import { Action, Icon, showToast, Toast } from "@raycast/api";
import { getUserFacingErrorMessage } from "../lib/api";
import { authorizeTeak } from "../lib/oauth";

interface SignInWithBrowserActionProps {
  onSignedIn?: () => void;
}

export function SignInWithBrowserAction({
  onSignedIn,
}: SignInWithBrowserActionProps) {
  return (
    <Action
      icon={Icon.Globe}
      onAction={async () => {
        try {
          await authorizeTeak();
          onSignedIn?.();
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Sign-in failed",
            message: getUserFacingErrorMessage(error),
          });
        }
      }}
      title="Sign in with Browser"
    />
  );
}
