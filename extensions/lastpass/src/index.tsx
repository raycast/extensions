import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { AccountDetail } from "./accountDetail";
import { ErrorDetail } from "./errorDetail";
import { lastPass } from "./utils/cli";

interface Preferences {
  email: string;
  password: string;
}

const faviconForDomain = (url: string) => {
  try {
    const domain = new URL(url).hostname;
    return `https://icons.bitwarden.net/${domain}/icon.png`;
  } catch (err) {
    return Icon.Key;
  }
};

export default function Command() {
  const { email, password } = getPreferenceValues<Preferences>();
  const api = lastPass(email, password);
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

        const account = await api.list();
        setAccounts(account);
      } catch (error) {
        if (error instanceof Error) {
          setError(error);
          showToast({
            style: Toast.Style.Failure,
            title: "Something went wrong",
            message: error.message,
          });
        }
      }
    })();
  }, []);

  return error ? (
    <ErrorDetail error={error} />
  ) : (
    <List
      isLoading={accounts.length === 0}
      actions={
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
      }
    >
      {accounts.map(({ id, name, username, password, url }) => (
        <List.Item
          id={id}
          key={id}
          icon={faviconForDomain(url)}
          title={name}
          subtitle={username}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Paste
                  icon={Icon.Clipboard}
                  title={"Paste Password"}
                  shortcut={{ modifiers: [], key: "enter" }}
                  content={password}
                />
                <Action.CopyToClipboard
                  icon={Icon.Clipboard}
                  title={"Paste Username"}
                  shortcut={{ modifiers: ["shift"], key: "enter" }}
                  content={username}
                />
                <Action.CopyToClipboard
                  icon={Icon.Clipboard}
                  title={"Copy Password"}
                  shortcut={{ modifiers: ["cmd"], key: "p" }}
                  content={password}
                />
                <Action.CopyToClipboard
                  icon={Icon.Clipboard}
                  title={"Copy Username"}
                  shortcut={{ modifiers: ["cmd"], key: "u" }}
                  content={username}
                />
                <Action.Push
                  title="Show details"
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                  target={<AccountDetail getData={() => api.show(id)} />}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
