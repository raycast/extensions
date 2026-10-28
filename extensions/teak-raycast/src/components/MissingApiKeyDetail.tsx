import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { getUserFacingErrorMessage } from "../lib/api";
import { TEAK_API_KEYS_URL } from "../lib/constants";
import { authorizeTeak } from "../lib/oauth";
import { SetApiKeyAction } from "./SetApiKeyAction";
import { SignInWithBrowserAction } from "./SignInWithBrowserAction";

interface MissingApiKeyDetailProps {
  error?: string | null;
  onSignedIn?: () => void;
}

/**
 * A signed-out command opens Raycast's "Sign in with Teak" prompt straight
 * away. This view only shows when that prompt is closed or fails, so there is
 * always a way to try again.
 */
export function MissingApiKeyDetail({
  onSignedIn,
  error,
}: MissingApiKeyDetailProps) {
  const [signInError, setSignInError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(!error);
  const started = useRef(false);

  useEffect(() => {
    if (error || started.current) {
      return;
    }
    started.current = true;
    authorizeTeak()
      .then(() => onSignedIn?.())
      .catch((authorizeError) => {
        setSignInError(getUserFacingErrorMessage(authorizeError));
        setIsSigningIn(false);
      });
  }, [error, onSignedIn]);

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
        signInError
          ? `Sign-in didn't finish: ${signInError}`
          : "Sign-in didn't finish.",
        "",
        "Press **Enter** to sign in with your browser, or use **Set API Key** to paste a key from **Teak Settings → Integrations → API keys**.",
      ].join("\n")}
    />
  );
}
