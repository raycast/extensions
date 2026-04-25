import { Action, Alert, Icon, confirmAlert } from "@raycast/api";
import { useAuth } from "@/hooks/use-auth";
import { reportError } from "@/lib/errors";

export function SignOutAction() {
  const { isAuthenticated, signOut, user } = useAuth();

  if (!isAuthenticated) return null;

  const handleSignOut = async () => {
    const confirmed = await confirmAlert({
      title: "Sign out of spoo.me?",
      message: user?.email
        ? `You'll need to sign in again to access links for ${user.email}.`
        : "You'll need to sign in again to access your links.",
      primaryAction: {
        title: "Sign Out",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    try {
      await signOut();
    } catch (err) {
      await reportError(err);
    }
  };

  return (
    <Action
      title="Sign Out"
      icon={Icon.Logout}
      shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
      style={Action.Style.Destructive}
      onAction={handleSignOut}
    />
  );
}
