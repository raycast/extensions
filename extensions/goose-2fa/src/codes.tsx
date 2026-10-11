import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LaunchProps } from "@raycast/api";
import { formatCode } from "../vendor/lib/otp";
import { filterAccounts } from "../vendor/lib/search";
import type { AccountData, VaultGroup } from "../vendor/lib/types";
import AccountForm from "./account-form";
import { commit } from "./lib/commit";
import { deliverCode } from "./lib/deliver";
import { t } from "./lib/i18n";
import { useOtpCodes } from "./lib/use-otp";
import { moveToTrash } from "./lib/vault-ops";
import { clearSyncLock, refreshVault, useVault } from "./lib/vault-store";
import ManageData, { ImportForm } from "./manage-data";
import ScanQr, { type ScanResult } from "./scan-qr";

const ONBOARDED_KEY = "goose-2fa-onboarded";

function ManageActions() {
  return (
    <>
      <ActionPanel.Section title={t("Add Accounts", "添加账户")}>
        <Action.Push
          title={t("Paste Secret to Add Account", "粘贴密钥添加账户")}
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          target={<AccountForm mode="create" />}
        />
        <Action.Push
          title={t("Scan Screenshot", "截屏识码")}
          icon={Icon.Camera}
          shortcut={Keyboard.Shortcut.Common.Save}
          target={<ScanQr />}
        />
        <Action.Push
          title={t("Scan Image", "从图片识码")}
          icon={Icon.Image}
          shortcut={Keyboard.Shortcut.Common.Duplicate}
          target={<ScanQr source="image" />}
        />
      </ActionPanel.Section>
      <Action.Push title={t("Open Settings & Data", "打开设置与数据")} icon={Icon.Gear} target={<ManageData />} />
      <Action
        title={t("Open Extension Preferences", "打开扩展设置")}
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
    </>
  );
}

export default function Codes(
  props: LaunchProps<{ arguments: { query?: string }; launchContext: { scanResult?: ScanResult } }>,
) {
  const preferences = getPreferenceValues<Preferences>();
  const vault = useVault();
  const { push } = useNavigation();
  const resumedScan = useRef<string | undefined>(undefined);
  const scanResult = props.launchContext?.scanResult;
  const argQuery = props.arguments?.query?.trim() ?? "";
  const [query, setQuery] = useState(argQuery);
  const [quickDone, setQuickDone] = useState(false);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const codes = useOtpCodes(vault.accounts);
  const visible = useMemo(() => filterAccounts(vault.accounts, query), [vault.accounts, query]);

  useEffect(() => {
    if (!scanResult || vault.status !== "ready" || resumedScan.current === scanResult.id) return;
    resumedScan.current = scanResult.id;
    push(<ScanQr source={scanResult.source} result={scanResult} />);
  }, [scanResult, vault.status, push]);

  useEffect(() => {
    let active = true;
    void LocalStorage.getItem<boolean>(ONBOARDED_KEY)
      .then((value) => {
        if (active) setOnboarded(value === true);
      })
      .catch(() => {
        if (active) setOnboarded(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (
      vault.status !== "ready" ||
      onboarded !== false ||
      ![vault.accounts.length, vault.groups.length, vault.trash.length].some(Boolean)
    )
      return;
    setOnboarded(true);
    void LocalStorage.setItem(ONBOARDED_KEY, true);
  }, [vault.status, vault.accounts.length, vault.groups.length, vault.trash.length, onboarded]);

  useEffect(() => {
    if (scanResult || quickDone || !argQuery || vault.status === "loading" || visible.length !== 1) return;
    const account = visible[0];
    if (!account) return;
    const code = codes[account.id]?.code;
    if (!code || !/^\d+$/.test(code)) return;
    setQuickDone(true);
    void deliverCode(account, code, preferences.enterAction ?? "copy", preferences.closeAfterCopy ?? true);
  }, [
    scanResult,
    argQuery,
    vault.status,
    visible,
    codes,
    quickDone,
    preferences.enterAction,
    preferences.closeAfterCopy,
  ]);

  const welcome =
    vault.status === "ready" &&
    onboarded === false &&
    !vault.accounts.length &&
    !vault.groups.length &&
    !vault.trash.length &&
    !vault.message &&
    !query;
  const issueActions = (
    <ActionPanel>
      <Action
        title={t("Reload Data Source", "重新读取数据源文件")}
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => void refreshVault()}
      />
      {vault.lockHeld !== null && (
        <Action
          title={t("Remove Stale Lock (ensure no other client is writing)", "清理残留锁文件（确认没有其他端在写）")}
          icon={Icon.LockUnlocked}
          style={Action.Style.Destructive}
          onAction={async () => {
            const removed = await clearSyncLock();
            await showToast(
              removed
                ? {
                    style: Toast.Style.Success,
                    title: t("Stale lock removed", "已清理残留锁"),
                    message: t("Please retry your last change.", "请重新执行刚才的改动。"),
                  }
                : {
                    style: Toast.Style.Failure,
                    title: t("Lock file not found", "没有找到锁文件"),
                    message: t("It may have been released by its owner.", "可能已被持有者释放。"),
                  },
            );
          }}
        />
      )}
      <ManageActions />
    </ActionPanel>
  );

  return (
    <List
      isLoading={vault.status === "loading" || vault.syncStatus === "writing"}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder={t("Search accounts or issuers", "搜索账户或发行方")}
    >
      {!welcome && (
        <List.EmptyView
          title={t("No Accounts", "暂无账户")}
          actions={
            <ActionPanel>
              <ManageActions />
            </ActionPanel>
          }
        />
      )}
      {vault.message && (
        <List.Section title={t("Action Required", "需要处理")}>
          <List.Item
            icon={Icon.Warning}
            title={vault.source === "file" ? t("Data Source File", "数据源文件") : t("Local Vault", "本地库")}
            subtitle={vault.message}
            actions={issueActions}
          />
        </List.Section>
      )}
      {welcome && (
        <List.Section title={t("Get Started", "首次使用 · 快捷操作")}>
          <List.Item
            icon={Icon.Plus}
            title={t("Add Account", "添加账户")}
            subtitle={t("Paste a secret key", "粘贴密钥")}
            actions={
              <ActionPanel>
                <Action.Push
                  title={t("Paste Secret to Add Account", "粘贴密钥添加账户")}
                  icon={Icon.Plus}
                  shortcut={Keyboard.Shortcut.Common.New}
                  target={<AccountForm mode="create" />}
                />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.Download}
            title={t("Import Account", "导入账户")}
            subtitle={t("Screenshot, image or JSON", "截屏 / 图片 / JSON")}
            actions={
              <ActionPanel>
                <Action.Push
                  title={t("Scan Screenshot", "截屏识码")}
                  icon={Icon.Camera}
                  shortcut={Keyboard.Shortcut.Common.Save}
                  target={<ScanQr />}
                />
                <Action.Push
                  title={t("Scan Image", "从图片识码")}
                  icon={Icon.Image}
                  shortcut={Keyboard.Shortcut.Common.Duplicate}
                  target={<ScanQr source="image" />}
                />
                <Action.Push
                  title={t("Import JSON Backup", "导入 JSON 备份")}
                  icon={Icon.Upload}
                  target={<ImportForm />}
                />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.Gear}
            title={t("Open Extension Preferences", "打开扩展设置")}
            subtitle={t("Configure preferences and sync", "配置偏好与同步选项")}
            actions={
              <ActionPanel>
                <Action
                  title={t("Open Extension Preferences", "打开扩展设置")}
                  icon={Icon.Gear}
                  onAction={openExtensionPreferences}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
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
  const groupName = account.groupId ? groups.find((candidate) => candidate.id === account.groupId)?.name : undefined;
  const issuer = account.issuer.trim().replace(/^['"]|['"]$/g, "");
  // ponytail: Common issuers get bundled monograms; unknown issuers use a neutral icon until a user-supplied icon feature exists.
  const icon =
    (
      {
        openai: "brand-openai.svg",
        google: "brand-google.svg",
        vercel: "brand-vercel.svg",
        xai: "brand-xai.svg",
      } as Record<string, string>
    )[issuer.toLowerCase()] ?? Icon.Circle;
  const title = account.note || issuer || account.name;
  const subtitle = [
    account.note ? issuer : null,
    account.name !== title ? account.name : null,
    groupName,
    account.remark,
  ]
    .filter(Boolean)
    .join(" · ");
  const accessories = [
    { text: /^\d+$/.test(code) ? formatCode(code) : "…" },
    account.type === "totp" ? { text: remaining >= 0 ? `${remaining}s` : "" } : { text: `HOTP #${account.counter}` },
  ];
  return (
    <List.Item
      icon={icon}
      title={title}
      subtitle={subtitle}
      keywords={[account.name, account.issuer, account.note ?? "", account.remark ?? ""].filter(Boolean)}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title={
              enterAction === "copy"
                ? t("Copy Code", "复制验证码")
                : t("Paste into Previous Field", "粘贴到上一个输入框")
            }
            icon={Icon.Clipboard}
            onAction={() => void deliverCode(account, code, enterAction, closeAfterCopy)}
          />
          <Action
            title={
              enterAction === "copy"
                ? t("Paste into Previous Field", "粘贴到上一个输入框")
                : t("Copy Code", "复制验证码")
            }
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={() => void deliverCode(account, code, enterAction === "copy" ? "paste" : "copy", closeAfterCopy)}
          />
          <Action.Push
            title={t("Edit Account", "编辑账户")}
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={<AccountForm mode="edit" account={account} />}
          />
          <ManageActions />
          <ActionPanel.Section>
            <Action
              title={t("Move to Trash", "移入回收站")}
              icon={Icon.Trash}
              shortcut={Keyboard.Shortcut.Common.Remove}
              style={Action.Style.Destructive}
              onAction={() =>
                void commit((snapshot) => moveToTrash(snapshot, account.id), t("Moved to Trash", "已移入回收站"))
              }
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
