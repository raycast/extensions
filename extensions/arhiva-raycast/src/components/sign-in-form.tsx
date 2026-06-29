import { Action, ActionPanel, Detail, Icon, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";

import { signInWithWebApp } from "../lib/auth";
import { getErrorMessage } from "../lib/errors";
import { getWebAppUrl } from "../lib/preferences";

type SignInFormProps = Readonly<{
  onSignedIn?: () => void;
}>;

export function SignInForm({ onSignedIn }: SignInFormProps) {
  const hasStartedSignInRef = useRef(false);
  const [state, setState] = useState<
    Readonly<{ status: "opening" }> | Readonly<{ status: "failed"; message: string }>
  >({ status: "opening" });

  const handleSignIn = useCallback(async () => {
    hasStartedSignInRef.current = true;
    setState({ status: "opening" });
    const toast = await showToast(Toast.Style.Animated, "Opening web sign-in");

    try {
      const session = await signInWithWebApp();
      toast.style = Toast.Style.Success;
      toast.title = "Signed in to arhiva";
      toast.message = session.user.email;
      onSignedIn?.();
    } catch (error) {
      const message = getErrorMessage(error, "Unable to sign in.");
      toast.style = Toast.Style.Failure;
      toast.title = "Sign in failed";
      toast.message = message;
      setState({ status: "failed", message });
    }
  }, [onSignedIn]);

  useEffect(() => {
    if (hasStartedSignInRef.current) {
      return;
    }

    void handleSignIn();
  }, [handleSignIn]);

  if (state.status === "opening") {
    return <Detail isLoading markdown="" />;
  }

  return (
    <Detail
      markdown={`# Sign in failed\n\n${state.message}`}
      actions={
        <ActionPanel>
          <Action title="Try Again" icon={Icon.Globe} onAction={() => void handleSignIn()} />
          <Action.OpenInBrowser title="Open Arhiva" url={getWebAppUrl("/sign-in")} />
        </ActionPanel>
      }
    />
  );
}
