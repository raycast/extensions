import { getPreferenceValues, List, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { lastPass } from "./cli";
import { EmptyListView, ErrorDetails, ListItem } from "./components";
import { Preferences, SyncRate } from "./types";

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
  const { email, password, syncRate, hidePassword } = getPreferenceValues<Preferences>();
  const [showPassword, setShowPassword] = useState(!hidePassword);

  const api = lastPass(email, password);
  const [isLoading, setIsLoading] = useState(true);
  const [accounts, setAccounts] = useState<
    { id: string; name: string; username: string; password: string; url: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

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
        setError((error as Error)?.message || "");
      }
    })();
  }, []);

  if (error) {
    return <ErrorDetails maskPattern={password} error={error} />;
  }

  return (
    <List isLoading={isLoading} isShowingDetail>
      {!accounts.length ? (
        <EmptyListView />
      ) : (
        accounts.map((account) => (
          <ListItem
            key={account.id}
            {...account}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            getDetails={() => calculateSyncState(syncRate).then((sync) => api.show(account.id, { sync }))}
          />
        ))
      )}
    </List>
  );
}
