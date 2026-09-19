import { Action, ActionPanel, Icon, LaunchType, List, Toast, launchCommand, showToast } from "@raycast/api";
import { useMemo, useState } from "react";
import { buildGroupTallies, filterByGroup, UNGROUPED_KEY } from "../../src/lib/groups";
import { formatCode } from "../../src/lib/otp";
import { filterAccounts } from "../../src/lib/search";
import type { AccountData, VaultGroup } from "../../src/lib/types";
import { commit } from "./lib/commit";
import { deliverCode } from "./lib/deliver";
import { useOtpCodes } from "./lib/use-otp";
import { moveToTrash } from "./lib/vault-ops";
import { clearSyncLock, refreshVault, useVault } from "./lib/vault-store";

const ALL_GROUPS = "__all__";

export default function Codes() {
  const vault = useVault();
  const [query, setQuery] = useState("");
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

  return (
    <List
      isLoading={vault.status === "loading" || vault.syncStatus === "writing"}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="搜索账户、发行方、备注或分组"
      searchBarAccessory={
        <List.Dropdown tooltip="分组" value={group} onChange={setGroup}>
          <List.Dropdown.Item title={`全部账户 (${vault.accounts.length})`} value={ALL_GROUPS} />
          {tallies.map((tally) => (
            <List.Dropdown.Item
              key={tally.id}
              title={`${tally.name} (${tally.count})`}
              value={tally.id === UNGROUPED_KEY ? UNGROUPED_KEY : tally.id}
            />
          ))}
        </List.Dropdown>
      }
    >
      {vault.message ? (
        <List.Section title="需要处理">
          <List.Item
            icon={Icon.Warning}
            title={vault.source === "file" ? "数据源文件" : "本地库"}
            subtitle={vault.message}
            actions={
              <ActionPanel>
                <Action title="重新读取数据源文件" icon={Icon.ArrowClockwise} onAction={() => void refreshVault()} />
                {vault.lockHeld !== null && (
                  <Action
                    title="清理残留锁文件（确认没有其他端在写）"
                    icon={Icon.LockUnlocked}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      const removed = await clearSyncLock();
                      await showToast(
                        removed
                          ? { style: Toast.Style.Success, title: "已清理残留锁", message: "请重新执行刚才的改动。" }
                          : { style: Toast.Style.Failure, title: "没有找到锁文件", message: "可能已被持有者释放。" },
                      );
                    }}
                  />
                )}
                <Action
                  title="打开账户与数据"
                  icon={Icon.Gear}
                  onAction={() => void launchCommand({ name: "manage-data", type: LaunchType.UserInitiated })}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
      {vault.notice ? (
        <List.Section title="状态">
          <List.Item icon={Icon.CheckCircle} title={vault.notice} subtitle={vault.source === "file" ? vault.filePath : "Raycast 本地库"} />
        </List.Section>
      ) : null}
      <List.Section title="验证码" subtitle={`${visible.length} 个账户`}>
        {visible.map((account) => (
          <CodeItem
            key={account.id}
            account={account}
            groups={vault.groups}
            code={codes[account.id]?.code ?? "------"}
            remaining={codes[account.id]?.remaining ?? -1}
          />
        ))}
      </List.Section>
      <List.Section title="数据源">
        <List.Item
          icon={Icon.HardDrive}
          title={vault.source === "file" ? vault.filePath : "未配置文件（使用 Raycast 本地库）"}
          subtitle={`同步状态：${vault.syncStatus}`}
          actions={
            <ActionPanel>
              <Action title="重新读取数据源文件" icon={Icon.ArrowClockwise} onAction={() => void refreshVault()} />
              <Action
                title="打开账户与数据"
                icon={Icon.Gear}
                onAction={() => void launchCommand({ name: "manage-data", type: LaunchType.UserInitiated })}
              />
            </ActionPanel>
          }
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
}: {
  account: AccountData;
  groups: VaultGroup[];
  code: string;
  remaining: number;
}) {
  const groupName = account.groupId
    ? groups.find((candidate) => candidate.id === account.groupId)?.name
    : undefined;
  const subtitle = [account.issuer, groupName, account.remark].filter(Boolean).join(" · ");
  const accessories = [
    { text: code === "------" ? "…" : formatCode(code) },
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
      actions={
        <ActionPanel>
          <Action title="复制验证码" icon={Icon.Clipboard} onAction={() => void deliverCode(account, code, "copy")} />
          <Action
            title="粘贴到前台应用"
            icon={Icon.Clipboard}
            onAction={() => void deliverCode(account, code, "paste")}
          />
          <Action
            title="真实输入到前台应用"
            icon={Icon.Keyboard}
            onAction={() => void deliverCode(account, code, "type")}
          />
          <ActionPanel.Section>
            <Action title="重新读取数据源文件" icon={Icon.ArrowClockwise} onAction={() => void refreshVault()} />
            <Action
              title="移入回收站"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => void commit((snapshot) => moveToTrash(snapshot, account.id), "已移入回收站")}
            />
            <Action
              title="打开账户与数据"
              icon={Icon.Gear}
              onAction={() => void launchCommand({ name: "manage-data", type: LaunchType.UserInitiated })}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
