import { Action, ActionPanel, Grid, Icon, List, getPreferenceValues } from "@raycast/api";
import GetSessionTokenForm from "./GetSessionTokenForm";
import { useEffect } from "react";

const PushTarget = ({ children, onPop }: { children: React.ReactNode; onPop?: () => void }) => {
  useEffect(() => {
    return () => {
      onPop && onPop();
    };
  }, []);
  return <>{children}</>;
};
export const SessionTokenGuard = ({ type, children }: { type: "grid" | "list"; children: React.ReactNode }) => {
  const { NINTENDO_SESSION_TOKEN } = getPreferenceValues<{ NINTENDO_SESSION_TOKEN?: string }>();

  const emptyViewProps = {
    title: "Please get the session token first ( ↵ ).",
    description: "If you have already set the Session Token in the preference, \nplease reopen the command.",
    icon: Icon.Key,
    actions: (
      <ActionPanel>
        <Action.Push
          title="Get Session Token"
          target={
            <PushTarget>
              <GetSessionTokenForm />
            </PushTarget>
          }
        />
      </ActionPanel>
    ),
  };
  if (!NINTENDO_SESSION_TOKEN) {
    return <>{type === "grid" ? <Grid.EmptyView {...emptyViewProps} /> : <List.EmptyView {...emptyViewProps} />}</>;
  }
  return <>{children}</>;
};
