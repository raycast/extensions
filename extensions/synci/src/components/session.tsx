import { Action, ActionPanel, Detail, Icon, List, launchCommand, LaunchType, popToRoot } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { createContext, useContext, type ComponentType, type ReactNode } from "react";
import { session } from "../lib/auth";
import { APP_URL } from "../lib/config";
import { markdown } from "../lib/format";
import { SignInRequiredError } from "../lib/oauth-session";

const SessionContext = createContext({ reconnect: async () => {}, signOut: async () => {} });
export const useSession = () => useContext(SessionContext);

export function withSynci<P extends object>(Command: ComponentType<P>) {
  return function AuthenticatedCommand(props: P) {
    const { data, error, isLoading, revalidate } = usePromise(() => session.accessToken(true), [], {
      onError: () => {},
    });
    const reconnect = () => launchCommand({ name: "reconnect-synci", type: LaunchType.UserInitiated });
    const signOut = async () => {
      await session.disconnect();
      await popToRoot();
    };
    if (error)
      return (
        <Detail
          markdown={`# Connect to Synci\n\n${markdown(error.message)}`}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action.OpenInBrowser title="Open Synci" url={APP_URL} />
            </ActionPanel>
          }
        />
      );
    if (isLoading || !data) return <List isLoading searchBarPlaceholder="Connecting to Synci…" />;
    return (
      <SessionContext.Provider value={{ reconnect, signOut }}>
        <Command {...props} />
      </SessionContext.Provider>
    );
  };
}

export function ErrorView({ error, retry, children }: { error: Error; retry: () => void; children?: ReactNode }) {
  const { reconnect } = useSession();
  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title={error instanceof SignInRequiredError ? "Sign In to Synci Again" : "Couldn't Load Synci"}
      description={error.message}
      actions={
        <ActionPanel>
          {error instanceof SignInRequiredError ? (
            <Action title="Sign in Again" icon={Icon.Person} onAction={reconnect} />
          ) : (
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={retry} />
          )}
          {!(error instanceof SignInRequiredError) && (
            <Action title="Reconnect Synci" icon={Icon.Person} onAction={reconnect} />
          )}
          <Action.OpenInBrowser title="Open Synci" url={APP_URL} />
          {children}
        </ActionPanel>
      }
    />
  );
}
