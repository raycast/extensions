import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences, Keyboard } from "@raycast/api";
import { ReactNode, useState } from "react";
import { KEITO_API_KEYS_DOCS_URL, KEITO_WEB_URL } from "../services/keito/config";
import { errorMessage, errorTitle, isKeitoError } from "../services/keito/errors";
import { ResolvedSession } from "../services/keito/session";
import { useKeitoSession } from "../services/useKeito";

export function SetupActions({ onRetry, signedOut }: { onRetry?: () => void; signedOut?: boolean }) {
  return (
    <>
      {signedOut && onRetry && <Action title="Sign in with Keito" icon={Icon.Person} onAction={onRetry} />}
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      {onRetry && !signedOut && (
        <Action
          title="Verify Connection Again"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onRetry}
        />
      )}
      <Action.OpenInBrowser title="Open Keito Setup Guide" url={KEITO_API_KEYS_DOCS_URL} />
      <Action.OpenInBrowser title="Open Keito" url={KEITO_WEB_URL} shortcut={Keyboard.Shortcut.Common.Open} />
    </>
  );
}

export function ConnectionErrorView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const setup = isKeitoError(error) && error.isSetupProblem;
  return (
    <List>
      <List.EmptyView
        icon={{ source: setup ? Icon.Key : Icon.ExclamationMark, tintColor: setup ? Color.Orange : Color.Red }}
        title={errorTitle(error)}
        description={errorMessage(error)}
        actions={
          <ActionPanel>
            <SetupActions onRetry={onRetry} signedOut={isKeitoError(error) && error.kind === "signed_out"} />
          </ActionPanel>
        }
      />
    </List>
  );
}

/**
 * Signs in (OAuth) or checks the API key preferences, then verifies the identity before rendering a
 * command. Every view command goes through this, so signed-out, rejected, read-only, or mismatched
 * credentials show setup guidance instead of a broken view.
 */
export function KeitoGate({ children }: { children: (session: ResolvedSession) => ReactNode }) {
  const [attempt, setAttempt] = useState(0);
  const { data: session, error, isLoading } = useKeitoSession(attempt);

  if (isLoading) return <List isLoading searchBarPlaceholder="Connecting to Keito…" />;
  if (error || !session) return <ConnectionErrorView error={error} onRetry={() => setAttempt((n) => n + 1)} />;
  return <>{children(session)}</>;
}
