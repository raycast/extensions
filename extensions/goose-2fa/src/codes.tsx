import { Action, ActionPanel, Grid, Icon, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import type { LaunchProps } from "@raycast/api";
import { buildGroupTallies, filterByGroup, UNGROUPED_KEY } from "../vendor/lib/groups";
import { formatCode } from "../vendor/lib/otp";
import { filterAccounts } from "../vendor/lib/search";
import type { AccountData, VaultGroup } from "../vendor/lib/types";
import { commit } from "./lib/commit";
import { deliverCode } from "./lib/deliver";
import { useOtpCodes } from "./lib/use-otp";
import { moveToTrash } from "./lib/vault-ops";
import { clearSyncLock, refreshVault, useVault } from "./lib/vault-store";
import ManageData from "./manage-data";

const ALL_GROUPS = "__all__";

export default function Codes(props: LaunchProps<{ arguments: { query?: string } }>) {
  const preferences = getPreferenceValues<Preferences>();
  const vault = useVault();
  const argQuery = props.arguments?.query?.trim() ?? "";
  const [query, setQuery] = useState(argQuery);
  const [quickDone, setQuickDone] = useState(false);
  const [group, setGroup] = useState<string>(ALL_GROUPS);
  const codes = useOtpCodes(vault.accounts);
  const tallies = useMemo(
    () => buildGroupTallies(vault.groups, vault.accounts),
    [vault.groups, vault.accounts],
  );
  const visible = useMemo(() => {
    const byGroup = filterByGroup(vault.accounts, group === ALL_GROUPS ? null : group);
    return filterAccounts(byGroup, query);
  }, [vault.accounts, group, query]);

  useEffect(() => {
    if (quickDone || !argQuery || vault.status === "loading") return;
    if (visible.length !== 1) return;
    const account = visible[0];
    if (!account) return;
    const code = codes[account.id]?.code;
    if (!code || !/^\d+$/.test(code)) return;
    setQuickDone(true);
    void deliverCode(account, code, preferences.enterAction ?? "copy", preferences.closeAfterCopy ?? true);
  }, [argQuery, vault.status, visible, codes, quickDone, preferences.enterAction, preferences.closeAfterCopy]);

  const issueActions = (
    <ActionPanel>
      <Action title={"Reload Data Source"} icon={Icon.ArrowClockwise} onAction={() => void refreshVault()} />
      {vault.lockHeld !== null && (
        <Action
          title={"Remove Stale Lock (ensure no other client is writing)"}
          icon={Icon.LockUnlocked}
          style={Action.Style.Destructive}
          onAction={async () => {
            const removed = await clearSyncLock();
            await showToast(
              removed
                ? { style: Toast.Style.Success, title: "Stale lock removed", message: "Please retry your last change." }
                : { style: Toast.Style.Failure, title: "Lock file not found", message: "It may have been released by its owner." },
            );
          }}
        />
      )}
      <Action.Push title={"Open Settings & Data"} icon={Icon.Gear} target={<ManageData />} />
    </ActionPanel>
  );

  if (preferences.viewMode === "grid") {
    return (
      <Grid
        columns={5}
        isLoading={vault.status === "loading" || vault.syncStatus === "writing"}
        filtering={false}
        searchText={query}
        onSearchTextChange={setQuery}
        searchBarPlaceholder={"Search accounts, issuers, notes or groups"}
        searchBarAccessory={
          <Grid.Dropdown tooltip={"Groups"} value={group} onChange={setGroup}>
            <Grid.Dropdown.Item title={`All Accounts (${vault.accounts.length})`} value={ALL_GROUPS} />
            {tallies.map((tally) => (
              <Grid.Dropdown.Item key={tally.id} title={`${tally.id === UNGROUPED_KEY ? "Ungrouped" : tally.name} (${tally.count})`} value={tally.id} />
            ))}
          </Grid.Dropdown>
        }
      >
        <Grid.EmptyView title={"No Accounts"} actions={<ActionPanel><Action.Push title={"Open Settings & Data"} icon={Icon.Gear} target={<ManageData />} /></ActionPanel>} />
        {vault.message && (
          <Grid.Section title={"Action Required"}>
            <Grid.Item content={Icon.Warning} title={"Data Source"} subtitle={vault.message} actions={issueActions} />
          </Grid.Section>
        )}
        <Grid.Section title={`Codes (${visible.length})`}>
          {visible.map((account) => {
            const code = codes[account.id]?.code ?? "------";
            return (
              <Grid.Item
                key={account.id}
                id={account.id}
                content={account.type === "hotp" ? Icon.Hashtag : Icon.Key}
                title={account.note || account.name}
                subtitle={/^\d+$/.test(code) ? formatCode(code) : "…"}
                keywords={[account.name, account.issuer, account.note ?? "", account.remark ?? ""]}
                actions={<CodeActions account={account} code={code} enterAction={preferences.enterAction ?? "copy"} closeAfterCopy={preferences.closeAfterCopy ?? true} />}
              />
            );
          })}
        </Grid.Section>
      </Grid>
    );
  }

  return (
    <List
      isLoading={vault.status === "loading" || vault.syncStatus === "writing"}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder={"Search accounts, issuers, notes or groups"}
      searchBarAccessory={
        <List.Dropdown tooltip={"Groups"} value={group} onChange={setGroup}>
          <List.Dropdown.Item title={`All Accounts (${vault.accounts.length})`} value={ALL_GROUPS} />
          {tallies.map((tally) => (
            <List.Dropdown.Item
              key={tally.id}
              title={`${tally.id === UNGROUPED_KEY ? "Ungrouped" : tally.name} (${tally.count})`}
              value={tally.id === UNGROUPED_KEY ? UNGROUPED_KEY : tally.id}
            />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView title={"No Accounts"} actions={<ActionPanel><Action.Push title={"Open Settings & Data"} icon={Icon.Gear} target={<ManageData />} /></ActionPanel>} />
      {vault.message ? (
        <List.Section title={"Action Required"}>
          <List.Item
            icon={Icon.Warning}
            title={vault.source === "file" ? "Data Source File" : "Local Vault"}
            subtitle={vault.message}
            actions={issueActions}
          />
        </List.Section>
      ) : null}
      <List.Section title={"Codes"} subtitle={`${visible.length} accounts`}>
        {visible.map((account) => (
          <CodeItem
            key={account.id}
            account={account}
            groups={vault.groups}
            code={codes[account.id]?.code ?? "------"}
            remaining={codes[account.id]?.remaining ?? -1}
            enterAction={preferences.enterAction ?? "copy"}
            closeAfterCopy={preferences.closeAfterCopy ?? true}
          />
        ))}
      </List.Section>
    </List>
  );
}

function CodeItem({
  account,
  groups,
  code,
  remaining,
  enterAction,
  closeAfterCopy,
}: {
  account: AccountData;
  groups: VaultGroup[];
  code: string;
  remaining: number;
  enterAction: "copy" | "paste";
  closeAfterCopy: boolean;
}) {
  const groupName = account.groupId
    ? groups.find((candidate) => candidate.id === account.groupId)?.name
    : undefined;
  const subtitle = [account.issuer, groupName, account.remark].filter(Boolean).join(" · ");
  const accessories = [
    { text: /^\d+$/.test(code) ? formatCode(code) : "…" },
    account.type === "totp"
      ? { text: remaining >= 0 ? `${remaining}s` : "" }
      : { text: `HOTP #${account.counter}` },
  ];

  return (
    <List.Item
      icon={account.type === "hotp" ? Icon.Hashtag : Icon.Key}
      title={account.note || account.name}
      subtitle={subtitle}
      keywords={[account.name, account.issuer, account.note ?? "", account.remark ?? ""].filter(Boolean)}
      accessories={accessories}
      actions={<CodeActions account={account} code={code} enterAction={enterAction} closeAfterCopy={closeAfterCopy} />}
    />
  );
}

function CodeActions({ account, code, enterAction, closeAfterCopy }: {
  account: AccountData;
  code: string;
  enterAction: "copy" | "paste";
  closeAfterCopy: boolean;
}) {
  return (
    <ActionPanel>
      <Action
        title={enterAction === "copy" ? "Copy Code" : "Paste into Previous Field"}
        icon={Icon.Clipboard}
        onAction={() => void deliverCode(account, code, enterAction, closeAfterCopy)}
      />
      <Action
        title={enterAction === "copy" ? "Paste into Previous Field" : "Copy Code"}
        icon={Icon.Clipboard}
        shortcut={{ modifiers: ["cmd"], key: "return" }}
        onAction={() => void deliverCode(account, code, enterAction === "copy" ? "paste" : "copy", closeAfterCopy)}
      />
      <Action
        title={"Type into Frontmost App"}
        icon={Icon.Keyboard}
        onAction={() => void deliverCode(account, code, "type")}
      />
      <ActionPanel.Section>
        <Action
          title={"Move to Trash"}
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={() => void commit((snapshot) => moveToTrash(snapshot, account.id), "Moved to Trash")}
        />
        <Action.Push title={"Open Settings & Data"} icon={Icon.Gear} target={<ManageData />} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
