import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { getUserFacingErrorMessage } from "../lib/api";
import { TEAK_API_KEYS_URL } from "../lib/constants";
import { authorizeTeak } from "../lib/oauth";
import { SetApiKeyAction } from "./SetApiKeyAction";
import { SignInWithBrowserAction } from "./SignInWithBrowserAction";
import { hasSignedOutThisRun } from "./SignOutAction";

interface MissingApiKeyDetailProps {
  error?: string | null;
  onSignedIn?: () => void;
}

export function MissingApiKeyDetail({
  onSignedIn,
  error,
}: MissingApiKeyDetailProps) {
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signedOut] = useState(hasSignedOutThisRun);
  const [isSigningIn, setIsSigningIn] = useState(!(error || signedOut));
  const started = useRef(false);

  useEffect(() => {
    if (error || signedOut || started.current) {
      return;
    }
    started.current = true;
    authorizeTeak()
      .then(() => onSignedIn?.())
      .catch((authorizeError) => {
        setSignInError(getUserFacingErrorMessage(authorizeError));
        setIsSigningIn(false);
      });
  }, [error, onSignedIn, signedOut]);

  if (error) {
    return (
      <Detail
        actions={
          <ActionPanel>
            <Action
              icon={Icon.ArrowClockwise}
              onAction={onSignedIn}
              title="Retry Connection"
            />
          </ActionPanel>
        }
        markdown={`## Connection unavailable\n\n${error}`}
      />
    );
  }

  if (isSigningIn) {
    return <Detail isLoading markdown="" />;
  }

  let status = "Sign-in didn't finish.";
  if (signInError) {
    status = `Sign-in didn't finish: ${signInError}`;
  } else if (signedOut) {
    status = "You're signed out.";
  }

  return (
    <Detail
      actions={
        <ActionPanel>
          <SignInWithBrowserAction onSignedIn={onSignedIn} />
          <SetApiKeyAction />
          <Action.OpenInBrowser
            title="Open API Keys in Teak"
            url={TEAK_API_KEYS_URL}
          />
        </ActionPanel>
      }
      markdown={[
        "## Sign in to Teak",
        "",
        status,
        "",
        "Press **Enter** to sign in with your browser, or use **Set API Key** to paste a key from **Teak Settings → Integrations → API keys**.",
      ].join("\n")}
    />
  );
}
