import { Action, Icon, Toast, showToast } from "@raycast/api";
import { signOut } from "../lib/auth";

type Props = { onSignedOut: () => void };

export function SignOutAction({ onSignedOut }: Props) {
  return (
    <Action
      title="Sign out"
      icon={Icon.Logout}
      style={Action.Style.Destructive}
      onAction={async () => {
        await signOut();
        await showToast({ style: Toast.Style.Success, title: "Signed out" });
        onSignedOut();
      }}
    />
  );
}
