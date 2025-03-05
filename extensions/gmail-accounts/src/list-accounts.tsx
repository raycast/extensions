import { Action, ActionPanel, closeMainWindow, Color, Icon, Image, List, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getAccounts, type Account } from "./gmail";
import { showFailureToast, useCachedState } from "@raycast/utils";
import { usePinnedAccounts, type PinMethods } from "./pinned";
import { execSync } from "node:child_process";

export default function Command() {
  const [accounts, setAccounts] = useCachedState<Account[]>("accounts", []);
  const [loading, setLoading] = useState(true);
  const { pinnedAccounts, ...pinnedMethods } = usePinnedAccounts();

  useEffect(() => {
    setLoading(true);
    getAccounts()
      .then((accounts) => {
        setAccounts(accounts);
      })
      .catch(async (err) => {
        await showFailureToast(err, { title: "Failed to load accounts" });
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return !isChromeInstalled() ? (
    <ErrorView />
  ) : (
    <List isLoading={accounts.length === 0 && loading}>
      <List.Section title="Pinned Accounts">
        {accounts
          .filter((account) => pinnedAccounts.includes(account.email))
          .toSorted((a, b) => pinnedAccounts.indexOf(a.email) - pinnedAccounts.indexOf(b.email))
          .map((account) => (
            <ListItem key={`pinned-${account.email}`} account={account} pinned={true} {...pinnedMethods} />
          ))}
      </List.Section>

      <List.Section title="Accounts">
        {accounts
          .filter((account) => !pinnedAccounts.includes(account.email))
          .map((account) => (
            <ListItem key={account.email} account={account} {...pinnedMethods} />
          ))}
      </List.Section>
    </List>
  );
}

function ListItem(props: { account: Account; pinned?: boolean } & PinMethods) {
  const { account } = props;

  async function handleOpenInChromeAction() {
    try {
      openInChrome(`https://mail.google.com/mail/u/${account.id}/#inbox`);
      await closeMainWindow();
    } catch (err) {
      await showFailureToast(err, { title: "Failed to open account in Chrome" });
    }
  }
  return (
    <List.Item
      title={account.email}
      subtitle={account.fullname}
      icon={{ source: account.avatar, mask: Image.Mask.Circle }}
      keywords={[account.email, account.fullname]}
      accessories={
        account.id === 0
          ? [{ tag: { value: "Default", color: Color.Blue } }]
          : account.isLoggedIn
            ? undefined
            : [
                {
                  tag: {
                    value: "Signed out",
                    color: Color.SecondaryText,
                  },
                },
              ]
      }
      actions={
        <ActionPanel>
          {account.isLoggedIn && (
            <>
              <Action title="Open in Chrome" onAction={handleOpenInChromeAction} />
              <Action.CopyToClipboard
                title="Copy URL"
                content={`https://mail.google.com/mail/u/${account.id}/#inbox`}
              />
            </>
          )}
          <PinActionSection {...props} />
        </ActionPanel>
      }
    />
  );
}

function PinActionSection(props: { account: Account; pinned?: boolean } & PinMethods) {
  const { account, pinned, ...methods } = props;
  const movements = methods.getAllowedMovements(account);

  return !pinned ? (
    <ActionPanel.Section>
      <Action
        title="Pin Account"
        icon={Icon.Pin}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        onAction={async () => {
          methods.pin(account);
          await showToast({ title: "Pinned account" });
        }}
      />
    </ActionPanel.Section>
  ) : (
    <ActionPanel.Section>
      <Action
        title="Unpin Account"
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        icon={Icon.PinDisabled}
        onAction={async () => {
          methods.unpin(account);
          await showToast({ title: "Unpinned account" });
        }}
      />
      {movements.includes("up") && (
        <Action
          title="Move up in Pinned Accounts"
          shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
          icon={Icon.ArrowUp}
          onAction={async () => {
            methods.moveUp(account);
            await showToast({ title: "Moved account up" });
          }}
        />
      )}
      {movements.includes("down") && (
        <Action
          title="Move Down in Pinned Accounts"
          shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
          icon={Icon.ArrowDown}
          onAction={async () => {
            methods.moveDown(account);
            await showToast({ title: "Moved account down" });
          }}
        />
      )}
    </ActionPanel.Section>
  );
}

function openInChrome(url: string) {
  execSync(`open -a "Google Chrome" ${url}`);
}

function ErrorView() {
  return (
    <List>
      <List.EmptyView
        title="Chrome is not installed on your system"
        description="Please install Chrome to use this extension."
        icon={{ source: Icon.Xmark, tintColor: Color.Red }}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Chrome Website" icon={Icon.Link} url="https://www.google.com/chrome/" />
          </ActionPanel>
        }
      />
    </List>
  );
}
function isChromeInstalled() {
  try {
    execSync("ls /Applications/Google\\ Chrome.app");
    return true;
  } catch {
    return false;
  }
}
