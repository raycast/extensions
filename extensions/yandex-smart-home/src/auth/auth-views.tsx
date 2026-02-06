import {
  Action,
  ActionPanel,
  List,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import { ConnectView } from "./ConnectForm";
import { useYandexAuth } from "./useYandexAuth";

function SetClientIdEmptyView() {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Key}
        title="Set Client ID"
        description="Open Preferences and paste your Yandex OAuth Client ID from oauth.yandex.com"
        actions={
          <ActionPanel>
            <Action
              title="Open Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

function LoadingEmptyView() {
  return (
    <List isLoading>
      <List.EmptyView icon={Icon.Gear} title="Loading…" />
    </List>
  );
}

/** Renders auth gate: no-client / loading / connect flow, or children with token. */
export function YandexAuthGate({
  children,
}: {
  children: (token: string) => React.ReactNode;
}) {
  const auth = useYandexAuth();

  if (auth.status === "no-client") return <SetClientIdEmptyView />;
  if (auth.status === "loading") return <LoadingEmptyView />;
  if (auth.status === "connect")
    return (
      <ConnectView
        clientId={auth.clientId!}
        onConnected={(t) => auth.setToken(t)}
      />
    );
  return <>{children(auth.token!)}</>;
}
