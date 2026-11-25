import { Action, ActionPanel, Icon, List, closeMainWindow, showHUD } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { ReactElement, useState } from "react";
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
  const { data: found, isLoading, revalidate } = usePromise(findAccounts, [query]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={TEXT.search}
      onSearchTextChange={setQuery}
      throttle
      filtering={false}
    >
      {found ? <Content found={found} retry={revalidate} /> : null}
    </List>
  );
}

function Content({ found, retry }: { found: Found; retry: () => void }) {
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
      return <Notice title={TEXT.disabledTitle} subtitle={TEXT.disabledSubtitle} action={openSafayAction} />;
    case "notReady":
      return <Notice title={TEXT.notReadyTitle} subtitle={TEXT.notReadySubtitle} action={openSafayAction} />;
    case "notRunning":
      return <Notice title={TEXT.notRunningTitle} action={openSafayAction} />;
    case "notInstalled":
      return (
        <Notice
          title={TEXT.notInstalledTitle}
          action={<Action.OpenInBrowser title={TEXT.download} url={DOWNLOAD_URL} />}
        />
      );
    case "error":
      return (
        <Notice
          title={TEXT.searchFailed}
          action={<Action title={TEXT.tryAgain} icon={Icon.ArrowClockwise} onAction={retry} />}
        />
      );
    case "permission":
      return (
        <Notice
          title={TEXT.permissionTitle}
          subtitle={TEXT.permissionSubtitle}
          action={
            <Action
              title={TEXT.openSettings}
              icon={Icon.Gear}
              onAction={() => attempt(openAutomationSettings, TEXT.openSettingsFailed)}
            />
          }
        />
      );
  }
}

const openSafayAction = (
  <Action title={TEXT.openSafay} icon={Icon.AppWindow} onAction={() => attempt(openSafay, TEXT.openSafayFailed)} />
);

/** Runs a recovery action and says so when it could not be done. */
async function attempt(run: () => Promise<void>, failure: string) {
  try {
    await run();
  } catch (error) {
    await showFailureToast(error, { title: failure });
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

function Notice({ title, subtitle, action }: { title: string; subtitle?: string; action: ReactElement }) {
  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title={title}
      description={subtitle}
      actions={<ActionPanel>{action}</ActionPanel>}
    />
  );
}
