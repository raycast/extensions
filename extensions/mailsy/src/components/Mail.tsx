import type { ReactElement } from "react";
import { useCallback, useState } from "react";
import { Action, ActionPanel, Color, Detail, Icon, Keyboard, List, popToRoot, showHUD } from "@raycast/api";
import { useAccount } from "../hooks/useAccount";
import { deleteAccount, deleteMail, getAccount, getMails, getMessageFilePath } from "../libs/api";
import { handleAction, removeAccount, timeAgo } from "../libs/utils";
import { Message } from "./Message";

const copyEmailShortcut: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "e" },
  Windows: { modifiers: ["ctrl", "shift"], key: "e" },
};

const copyPasswordShortcut: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "p" },
  Windows: { modifiers: ["ctrl", "shift"], key: "p" },
};

const deleteAccountShortcut: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "d" },
  Windows: { modifiers: ["ctrl", "shift"], key: "d" },
};

const logoutShortcut: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "l" },
  Windows: { modifiers: ["ctrl", "shift"], key: "l" },
};

const deleteMessageShortcut: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "d" },
  Windows: { modifiers: ["ctrl"], key: "d" },
};

export function Mail(): ReactElement {
  const [refreshKey, setRefreshKey] = useState(0);
  const [accountRefreshKey, setAccountRefreshKey] = useState(0);

  const fetchAccount = useCallback(() => getAccount(), [accountRefreshKey]);
  const { data: account, isLoading: isAccountLoading, error: accountError } = useAccount(fetchAccount);
  const fetchMails = useCallback(() => getMails(), [refreshKey]);
  const { data: mails, isLoading: isMailsLoading, error: mailsError } = useAccount(fetchMails);

  if (accountError || mailsError) {
    const errorMessage = accountError?.message ?? mailsError?.message ?? "Something went wrong";

    return (
      <Detail
        markdown={`# Failed to load mailbox\n\n${errorMessage}`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              icon={{ source: Icon.ArrowClockwise, tintColor: Color.Blue }}
              onAction={() => {
                if (accountError) {
                  setAccountRefreshKey((prev) => prev + 1);
                }

                setRefreshKey((prev) => prev + 1);
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List searchBarPlaceholder="Search Mails" isLoading={isAccountLoading || isMailsLoading}>
      <List.Section title="Account">
        <List.Item
          title={account?.email ?? ""}
          accessories={[
            { text: "Powered by" },
            { tag: { value: "mail.tm", color: Color.Purple }, tooltip: "https://mail.tm" },
          ]}
          icon={{ source: Icon.Envelope, tintColor: Color.Purple }}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Copy">
                <Action.CopyToClipboard
                  title="Copy Email"
                  content={account?.email ?? ""}
                  icon={{ source: Icon.Envelope, tintColor: Color.Purple }}
                  shortcut={copyEmailShortcut}
                />
                <Action.CopyToClipboard
                  title="Copy Password"
                  content={account?.password ?? ""}
                  icon={{ source: Icon.Key, tintColor: Color.Purple }}
                  shortcut={copyPasswordShortcut}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Account">
                <Action
                  title="Delete Account"
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  shortcut={deleteAccountShortcut}
                  onAction={() =>
                    handleAction(
                      () => deleteAccount(),
                      () => popToRoot(),
                      `Deleting Account...`,
                      `Account deleted`,
                      `Account could not be deleted`,
                    )
                  }
                />
                <Action
                  title="Logout"
                  icon={{ source: Icon.Lock, tintColor: Color.Red }}
                  shortcut={logoutShortcut}
                  onAction={() =>
                    handleAction(
                      () => removeAccount(),
                      () => popToRoot(),
                      `Logging out...`,
                      `Logout successful`,
                      `Logout failed`,
                    )
                  }
                />
              </ActionPanel.Section>
              <Action.OpenInBrowser
                title="Open in Browser"
                url="https://mail.tm/"
                icon={{ source: Icon.Globe, tintColor: Color.Blue }}
                onOpen={() => showHUD("Login to view your account")}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Messages">
        {mails?.map((mail) => (
          <List.Item
            key={mail.id}
            title={mail.subject || "No Subject"}
            icon={{ source: Icon.Message, tintColor: Color.Blue }}
            quickLook={{ path: getMessageFilePath(mail.id), name: mail.subject || "" }}
            accessories={[
              {
                icon: { source: Icon.Person, tintColor: Color.Green },
                tooltip: mail.from.name ?? mail.from.address ?? "",
              },
              {
                text: `${timeAgo(mail.createdAt)}`,
                icon: { source: Icon.Calendar, tintColor: Color.Blue },
                tooltip: new Date(mail.createdAt).toLocaleString(),
              },
            ]}
            actions={
              <ActionPanel>
                <Action.ToggleQuickLook title="Quick Look" icon={{ source: Icon.Eye, tintColor: Color.Blue }} />
                <Action.Push
                  title="View Message"
                  target={<Message messageId={mail.id} />}
                  icon={{ source: Icon.Message, tintColor: Color.Blue }}
                />
                <Action.OpenInBrowser
                  title="Open in Browser"
                  icon={{ source: Icon.Globe, tintColor: Color.Blue }}
                  url={`file://${getMessageFilePath(mail.id)}`}
                />
                <Action
                  title="Delete Message"
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  shortcut={deleteMessageShortcut}
                  onAction={() =>
                    handleAction(
                      () => deleteMail(mail.id),
                      () => setRefreshKey((prev) => prev + 1),
                      `Deleting Message...`,
                      `Message deleted`,
                      `Message could not be deleted`,
                    )
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
