import { Action, Icon, showToast, Toast } from "@raycast/api";
import { type SignOutResult, signOutTeak } from "../lib/oauth";
import { grandfatheredApiKey } from "../lib/preferences";

// Raycast runs each command fresh, so this lasts until the command closes.
let signedOutThisRun = false;

/** True once the person signed out in this command, so it doesn't ask them to sign in again. */
export const hasSignedOutThisRun = () => signedOutThisRun;

interface SignOutActionProps {
  /** Work to finish while still signed in, such as a change waiting to save. */
  beforeSignOut?: () => Promise<unknown>;
  onSignedOut?: () => void;
}

export function SignOutAction({
  beforeSignOut,
  onSignedOut,
}: SignOutActionProps) {
  if (grandfatheredApiKey()) {
    return null;
  }

  return (
    <Action
      icon={Icon.Logout}
      onAction={async () => {
        let result: SignOutResult;
        try {
          await beforeSignOut?.();
          result = await signOutTeak();
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not sign out of Teak",
            message: error instanceof Error ? error.message : "Try again.",
          });
          return;
        }
        signedOutThisRun = true;
        await showToast({
          style: Toast.Style.Success,
          title:
            result === "local-only"
              ? "Signed out on this Mac"
              : "Signed out of Teak",
          ...(result === "local-only"
            ? { message: "Other installations may still be connected." }
            : {}),
        });
        onSignedOut?.();
      }}
      shortcut={{ key: "x", modifiers: ["cmd", "shift"] }}
      style={Action.Style.Destructive}
      title="Sign Out"
    />
  );
}
