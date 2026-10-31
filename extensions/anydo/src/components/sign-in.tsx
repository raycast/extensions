import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  showToast,
} from "@raycast/api";

import { signIn } from "../anydo/auth";
import { errorMessage } from "./feedback";

export function SignInAction({ onSignedIn }: { onSignedIn?: () => void }) {
  async function handleSignIn() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Waiting for the browser sign-in…",
      message: "Approve the Any.do connection in your browser.",
    });
    try {
      await signIn();
      toast.style = Toast.Style.Success;
      toast.title = "Signed in to Any.do";
      toast.message = undefined;
      onSignedIn?.();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Sign-in failed";
      toast.message = errorMessage(error);
    }
  }

  return (
    <Action title="Sign in to Any.do" icon={Icon.Key} onAction={handleSignIn} />
  );
}

export function SignInEmptyView({ onSignedIn }: { onSignedIn?: () => void }) {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Key}
        title="Not signed in to Any.do"
        description="Sign in once: Raycast opens your browser, you approve the connection, and your tasks appear here."
        actions={
          <ActionPanel>
            <SignInAction onSignedIn={onSignedIn} />
          </ActionPanel>
        }
      />
    </List>
  );
}
