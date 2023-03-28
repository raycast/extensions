import { Action, ActionPanel, getPreferenceValues, Icon, List, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { lastPass } from "./cli";
import { EmptyListView, ErrorDetails, ListItem } from "./components";

type SyncRate = "0" | "86400000" | "604800000";
interface Preferences {
  email: string;
  password: string;
  syncRate: SyncRate;
}

const calculateSyncState = async (syncRate: SyncRate): Promise<"now" | "no"> => {
  const localStorageKey = "lastpass-sync-timestamp";
  const currentTimestamp = Date.now();
  const lastSyncTimestamp = (await LocalStorage.getItem<number>(localStorageKey)) || currentTimestamp;
  await LocalStorage.setItem(localStorageKey, currentTimestamp);
  const timestampDiff = parseInt(syncRate, 10);
  const isSyncNow = currentTimestamp - lastSyncTimestamp > timestampDiff;
  return isSyncNow ? "now" : "no";
};

export default function Command() {
  const { email, password, syncRate } = getPreferenceValues<Preferences>();

  const api = lastPass(email, password);
  const [isLoading, setIsLoading] = useState(true);
  const [accounts, setAccounts] = useState<
    { id: string; name: string; username: string; password: string; url: string }[]
  >([]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const isLogged = await api.isLogged();
        if (!isLogged) {
          await api.login();
        }

        const accounts = await calculateSyncState(syncRate).then((sync) => api.list({ sync }));
        setAccounts(accounts);
        setIsLoading(false);
      } catch (error) {
        if (error instanceof Error) {
          setError(error);
        }
      }
    })();
  }, []);

  if (error) {
    return <ErrorDetails error={error} />;
  }

  const actions = (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          icon={Icon.ArrowClockwise}
          title="Manual Sync"
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          onAction={() => api.export({ sync: "now" }).then(setAccounts, setError)}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  return (
    <List isLoading={isLoading} isShowingDetail actions={actions}>
      {!accounts.length ? (
        <EmptyListView />
      ) : (
        accounts.map((account) => (
          <ListItem
            {...account}
            getDetails={() => calculateSyncState(syncRate).then((sync) => api.show(account.id, { sync }))}
          />
        ))
      )}
    </List>
  );
}
