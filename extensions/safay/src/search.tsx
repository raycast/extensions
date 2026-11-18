import { Action, ActionPanel, Icon, List, closeMainWindow, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  Account,
  CopyStatus,
  DOWNLOAD_URL,
  Found,
  TEXT,
  copyCode,
  findAccounts,
  openAutomationSettings,
  openSafay,
} from "./safay";

export default function Command() {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Found>();

  useEffect(() => {
    let current = true;
    findAccounts(query).then((next) => current && setFound(next));
    return () => {
      current = false;
    };
  }, [query]);

  return (
    <List
      isLoading={!found}
      searchBarPlaceholder={TEXT.search}
      onSearchTextChange={setQuery}
      throttle
      filtering={false}
    >
      {found ? <Content found={found} /> : null}
    </List>
  );
}

function Content({ found }: { found: Found }) {
  switch (found.kind) {
    case "accounts":
      if (found.accounts.length === 0) return <List.EmptyView icon={Icon.MagnifyingGlass} title={TEXT.noMatches} />;
      return (
        <>
          {found.accounts.map((account) => (
            <AccountItem key={account.id} account={account} />
          ))}
        </>
      );
    case "disabled":
      return (
        <Notice title={TEXT.disabledTitle} subtitle={TEXT.disabledSubtitle} action={TEXT.openSafay} run={openSafay} />
      );
    case "notReady":
      return (
        <Notice title={TEXT.notReadyTitle} subtitle={TEXT.notReadySubtitle} action={TEXT.openSafay} run={openSafay} />
      );
    case "notRunning":
    case "error":
      return <Notice title={TEXT.notRunningTitle} action={TEXT.openSafay} run={openSafay} />;
    case "notInstalled":
      return (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={TEXT.notInstalledTitle}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title={TEXT.download} url={DOWNLOAD_URL} />
            </ActionPanel>
          }
        />
      );
    case "permission":
      return (
        <Notice
          title={TEXT.permissionTitle}
          subtitle={TEXT.permissionSubtitle}
          action={TEXT.openSettings}
          icon={Icon.Gear}
          run={openAutomationSettings}
        />
      );
  }
}

function AccountItem({ account }: { account: Account }) {
  return (
    <List.Item
      title={account.issuer}
      subtitle={account.username}
      icon={Icon.Key}
      actions={
        <ActionPanel>
          <Action title={TEXT.copy} icon={Icon.Clipboard} onAction={() => copy(account.id)} />
        </ActionPanel>
      }
    />
  );
}

/** Safay shows its own notice when the code is on the clipboard; only what Safay could not do is said here. */
async function copy(id: string) {
  // Out of the way of Touch ID or Safay's window.
  await closeMainWindow({ clearRootSearch: true });
  const status = await copyCode(id);
  const message: Partial<Record<CopyStatus, string>> = {
    failed: TEXT.failed,
    busy: TEXT.busy,
    not_found: TEXT.notFound,
    disabled: TEXT.disabledTitle,
    not_ready: TEXT.notReadyTitle,
    not_running: TEXT.notRunningTitle,
    permission: TEXT.permissionTitle,
  };
  const said = message[status];
  if (said) await showHUD(said);
}

function Notice({
  title,
  subtitle,
  action,
  icon = Icon.AppWindow,
  run,
}: {
  title: string;
  subtitle?: string;
  action: string;
  icon?: Icon;
  run: () => Promise<void>;
}) {
  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title={title}
      description={subtitle}
      actions={
        <ActionPanel>
          <Action title={action} icon={icon} onAction={run} />
        </ActionPanel>
      }
    />
  );
}
