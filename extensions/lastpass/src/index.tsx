import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { AccountDetail, UnknownError, CommandNotFoundError } from "./components";
import { lastPass } from "./cli";
import { getDomainFavicon } from "./utils";

interface Preferences {
  email: string;
  password: string;
}

const ErrorDetails = (args: { error: Error }) => {
  if (args.error.message.includes("command not found")) {
    showToast({
      style: Toast.Style.Failure,
      title: "LastPass CLI not found",
      message: args.error.message,
    });
    return <CommandNotFoundError />;
  } else {
    showToast({
      style: Toast.Style.Failure,
      title: "Something went wrong",
      message: args.error.message,
    });
    return <UnknownError error={args.error} />;
  }
};

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
  return (
    <List
      isLoading={isLoading}
      isShowingDetail
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
      {!accounts.length ? (
        <List.EmptyView title="Sorry, you have no accounts" />
      ) : (
        accounts.map(({ id, name, username, password, url }) => (
          <List.Item
            id={id}
            key={id}
            icon={getDomainFavicon(url)}
            title={name}
            detail={<AccountDetail getData={() => api.show(id)} />}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Paste
                    icon={Icon.Clipboard}
                    title="Paste Password"
                    shortcut={{ modifiers: [], key: "enter" }}
                    content={password}
                  />
                  <Action.CopyToClipboard
                    icon={Icon.Clipboard}
                    title="Paste Username"
                    shortcut={{ modifiers: ["shift"], key: "enter" }}
                    content={username}
                  />
                  <Action.CopyToClipboard
                    icon={Icon.Clipboard}
                    title="Copy Password"
                    shortcut={{ modifiers: ["cmd"], key: "p" }}
                    content={password}
                  />
                  <Action.CopyToClipboard
                    icon={Icon.Clipboard}
                    title="Copy Username"
                    shortcut={{ modifiers: ["cmd"], key: "u" }}
                    content={username}
                  />
                  <Action.CopyToClipboard
                    icon={Icon.Clipboard}
                    title="Copy Url"
                    shortcut={{ modifiers: ["cmd"], key: "l" }}
                    content={username}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
