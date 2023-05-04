import { Action, ActionPanel, Grid, Icon, List, getPreferenceValues } from "@raycast/api";
import GetSessionTokenForm from "./GetSessionTokenForm";

export const SessionTokenGuard = ({ type, children }: { type: "grid" | "list"; children: React.ReactNode }) => {
  const { NINTENDO_SESSION_TOKEN } = getPreferenceValues<{ NINTENDO_SESSION_TOKEN: string }>();
  const emptyViewProps = {
    title: "Please get the session token first ( ↵ ).",
    icon: Icon.Key,
    actions: (
      <ActionPanel>
        <Action.Push title="Get Session Token" target={<GetSessionTokenForm />} />
      </ActionPanel>
    ),
  };
  if (!NINTENDO_SESSION_TOKEN) {
    return <>{type === "grid" ? <Grid.EmptyView {...emptyViewProps} /> : <List.EmptyView {...emptyViewProps} />}</>;
  }
  return <>{children}</>;
};
