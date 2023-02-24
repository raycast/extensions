import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { lastPass } from "./cli";
import { EmptyListView, ErrorDetails, ListItem } from "./components";

interface Preferences {
  email: string;
  password: string;
}

export default function Command() {
  const { email, password } = getPreferenceValues<Preferences>();
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

        const accounts = await api.list();
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
          onAction={() => api.list({ sync: "now" }).then(setAccounts, setError)}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  return (
    <List isLoading={isLoading} isShowingDetail actions={actions}>
      {!accounts.length ? (
        <EmptyListView />
      ) : (
        accounts.map((account) => <ListItem {...account} getDetails={() => api.show(account.id)} />)
      )}
    </List>
  );
}
