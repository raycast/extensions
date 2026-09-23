import { Action, ActionPanel, Grid, Icon, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import type { LaunchProps } from "@raycast/api";
import { buildGroupTallies, filterByGroup, UNGROUPED_KEY } from "../vendor/lib/groups";
import { formatCode } from "../vendor/lib/otp";
import { filterAccounts } from "../vendor/lib/search";
import type { AccountData, VaultGroup } from "../vendor/lib/types";
import { syncStatus, t } from "./lib/i18n";
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
      <Action title={t("Reload Data Source", "重新读取数据源文件")} icon={Icon.ArrowClockwise} onAction={() => void refreshVault()} />
      {vault.lockHeld !== null && (
        <Action
          title={t("Remove Stale Lock (ensure no other client is writing)", "清理残留锁文件（确认没有其他端在写）")}
          icon={Icon.LockUnlocked}
          style={Action.Style.Destructive}
          onAction={async () => {
            const removed = await clearSyncLock();
            await showToast(
              removed
                ? { style: Toast.Style.Success, title: t("Stale lock removed", "已清理残留锁"), message: t("Please retry your last change.", "请重新执行刚才的改动。") }
                : { style: Toast.Style.Failure, title: t("Lock file not found", "没有找到锁文件"), message: t("It may have been released by its owner.", "可能已被持有者释放。") },
            );
          }}
        />
      )}
      <Action.Push title={t("Open Settings & Data", "打开设置与数据")} icon={Icon.Gear} target={<ManageData />} />
    </ActionPanel>
  );
  const sourceActions = (
    <ActionPanel>
      <Action title={t("Reload Data Source", "重新读取数据源文件")} icon={Icon.ArrowClockwise} onAction={() => void refreshVault()} />
      <Action.Push title={t("Open Settings & Data", "打开设置与数据")} icon={Icon.Gear} target={<ManageData />} />
    </ActionPanel>
  );
  const gridSourceActions = (
    <ActionPanel>
      <Action.Push title={t("Open Settings & Data", "打开设置与数据")} icon={Icon.Gear} target={<ManageData />} />
      <Action title={t("Reload Data Source", "重新读取数据源文件")} icon={Icon.ArrowClockwise} onAction={() => void refreshVault()} />
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
        searchBarPlaceholder={t("Search accounts, issuers, notes or groups", "搜索账户、发行方、备注或分组")}
        searchBarAccessory={
          <Grid.Dropdown tooltip={t("Groups", "分组")} value={group} onChange={setGroup}>
            <Grid.Dropdown.Item title={t(`All Accounts (${vault.accounts.length})`, `全部账户 (${vault.accounts.length})`)} value={ALL_GROUPS} />
            {tallies.map((tally) => (
              <Grid.Dropdown.Item key={tally.id} title={`${tally.id === UNGROUPED_KEY ? t("Ungrouped", "未分组") : tally.name} (${tally.count})`} value={tally.id} />
            ))}
          </Grid.Dropdown>
        }
      >
        {vault.message && (
          <Grid.Section title={t("Action Required", "需要处理")}>
            <Grid.Item content={Icon.Warning} title={t("Data Source", "数据源")} subtitle={vault.message} actions={issueActions} />
          </Grid.Section>
        )}
        <Grid.Section title={t(`Codes (${visible.length})`, `验证码 (${visible.length})`)}>
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
        <Grid.Section title={t("Data Source", "数据源")}>
          <Grid.Item
            content={Icon.HardDrive}
            title={t("Settings & Data", "设置与数据")}
            subtitle={vault.source === "file" ? vault.filePath : t("Raycast Local Vault", "Raycast 本地库")}
            actions={gridSourceActions}
          />
        </Grid.Section>
      </Grid>
    );
  }

  return (
    <List
      isLoading={vault.status === "loading" || vault.syncStatus === "writing"}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder={t("Search accounts, issuers, notes or groups", "搜索账户、发行方、备注或分组")}
      searchBarAccessory={
        <List.Dropdown tooltip={t("Groups", "分组")} value={group} onChange={setGroup}>
          <List.Dropdown.Item title={t(`All Accounts (${vault.accounts.length})`, `全部账户 (${vault.accounts.length})`)} value={ALL_GROUPS} />
          {tallies.map((tally) => (
            <List.Dropdown.Item
              key={tally.id}
              title={`${tally.id === UNGROUPED_KEY ? t("Ungrouped", "未分组") : tally.name} (${tally.count})`}
              value={tally.id === UNGROUPED_KEY ? UNGROUPED_KEY : tally.id}
            />
          ))}
        </List.Dropdown>
      }
    >
      {vault.message ? (
        <List.Section title={t("Action Required", "需要处理")}>
          <List.Item
            icon={Icon.Warning}
            title={vault.source === "file" ? t("Data Source File", "数据源文件") : t("Local Vault", "本地库")}
            subtitle={vault.message}
            actions={issueActions}
          />
        </List.Section>
      ) : null}
      {vault.notice ? (
        <List.Section title={t("Status", "状态")}>
          <List.Item icon={Icon.CheckCircle} title={vault.notice} subtitle={vault.source === "file" ? vault.filePath : t("Raycast Local Vault", "Raycast 本地库")} />
        </List.Section>
      ) : null}
      <List.Section title={t("Codes", "验证码")} subtitle={t(`${visible.length} accounts`, `${visible.length} 个账户`)}>
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
      <List.Section title={t("Data Source", "数据源")}>
        <List.Item
          icon={Icon.HardDrive}
          title={vault.source === "file" ? vault.filePath : t("No file configured (using Raycast Local Vault)", "未配置文件（使用 Raycast 本地库）")}
          subtitle={t(`Sync status: ${syncStatus(vault.syncStatus)}`, `同步状态：${syncStatus(vault.syncStatus)}`)}
          actions={sourceActions}
        />
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
        title={enterAction === "copy" ? t("Copy Code", "复制验证码") : t("Paste into Previous Field", "粘贴到上一个输入框")}
        icon={Icon.Clipboard}
        onAction={() => void deliverCode(account, code, enterAction, closeAfterCopy)}
      />
      <Action
        title={enterAction === "copy" ? t("Paste into Previous Field", "粘贴到上一个输入框") : t("Copy Code", "复制验证码")}
        icon={Icon.Clipboard}
        shortcut={{ modifiers: ["cmd"], key: "return" }}
        onAction={() => void deliverCode(account, code, enterAction === "copy" ? "paste" : "copy", closeAfterCopy)}
      />
      <Action
        title={t("Type into Frontmost App", "真实输入到前台应用")}
        icon={Icon.Keyboard}
        onAction={() => void deliverCode(account, code, "type")}
      />
      <ActionPanel.Section>
        <Action title={t("Reload Data Source", "重新读取数据源文件")} icon={Icon.ArrowClockwise} onAction={() => void refreshVault()} />
        <Action
          title={t("Move to Trash", "移入回收站")}
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={() => void commit((snapshot) => moveToTrash(snapshot, account.id), t("Moved to Trash", "已移入回收站"))}
        />
        <Action.Push title={t("Open Settings & Data", "打开设置与数据")} icon={Icon.Gear} target={<ManageData />} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
