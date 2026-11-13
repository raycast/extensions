import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";

import { MercuryLogin } from "../logins";
import { MercuryAuthError, TOKEN_SETTINGS_URL } from "../mercury";
import { AddAccountForm } from "./AddAccountForm";

/** Shown by every command when no Mercury account has been added yet. */
export function NoAccountsView({ onAdded }: { onAdded: () => void }) {
  return (
    <List.EmptyView
      icon={{ source: "mercury-logo.svg", tintColor: Color.PrimaryText }}
      title="Add a Mercury account"
      description="Add a Read Only token for your personal or business account."
      actions={
        <ActionPanel>
          <Action.Push title="Add Account" icon={Icon.Plus} target={<AddAccountForm onSaved={onAdded} />} />
          <Action.OpenInBrowser title="Open Mercury Token Settings" url={TOKEN_SETTINGS_URL} />
        </ActionPanel>
      }
    />
  );
}

/** A failed request for one login: a rejected token offers Update Token, anything else Try Again. */
export function LoginErrorView({
  login,
  error,
  onRetry,
  onUpdated,
}: {
  login?: MercuryLogin;
  error: Error;
  onRetry: () => void;
  onUpdated: () => void;
}) {
  if (error instanceof MercuryAuthError) {
    return (
      <List.EmptyView
        icon={{ source: Icon.Key, tintColor: Color.Red }}
        title={login ? `Mercury rejected the token for ${login.name}` : "Mercury rejected your API token"}
        description={`${error.message.replace(/\.$/, "")}. Add a valid Read Only token in Manage Accounts.`}
        actions={
          <ActionPanel>
            {login && (
              <Action.Push
                title="Update Token"
                icon={Icon.Key}
                target={<AddAccountForm replacing={login} onSaved={onUpdated} />}
              />
            )}
            <Action.OpenInBrowser title="Open Mercury Token Settings" url={TOKEN_SETTINGS_URL} />
          </ActionPanel>
        }
      />
    );
  }
  return (
    <List.EmptyView
      icon={{ source: Icon.Warning, tintColor: Color.Orange }}
      title="Couldn't reach Mercury"
      description={error.message}
      actions={
        <ActionPanel>
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
        </ActionPanel>
      }
    />
  );
}

/**
 * One row per login that failed while others loaded, so a partial list never passes for a
 * complete one. A rejected token offers Update Token.
 */
export function FailureRows({
  failures,
  onRetry,
  onUpdated,
}: {
  failures: Array<{ login: MercuryLogin; error: Error; what?: string }>;
  onRetry: () => void;
  onUpdated: () => void;
}) {
  return (
    <>
      {failures.map(({ login, error, what }) => (
        <List.Item
          key={`failure-${login.id}-${what ?? ""}`}
          icon={{ source: error instanceof MercuryAuthError ? Icon.Key : Icon.Warning, tintColor: Color.Orange }}
          title={`Couldn't load ${what ?? login.name}`}
          subtitle={error.message}
          actions={
            <ActionPanel>
              {error instanceof MercuryAuthError ? (
                <Action.Push
                  title="Update Token"
                  icon={Icon.Key}
                  target={<AddAccountForm replacing={login} onSaved={onUpdated} />}
                />
              ) : (
                <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
              )}
            </ActionPanel>
          }
        />
      ))}
    </>
  );
}
