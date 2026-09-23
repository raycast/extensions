import { Action, ActionPanel, Icon, List, Toast, popToRoot, showToast } from "@raycast/api";
import { unlinkSync } from "node:fs";
import { useEffect, useState } from "react";
import { deduplicateImports, parseImportBundle } from "../vendor/lib/data-transfer";
import type { NewAccountInput } from "../vendor/lib/types";
import { t } from "./lib/i18n";
import { commit } from "./lib/commit";
import { captureScreenToTempFile, detectBarcodes } from "./lib/helper";
import { addAccounts } from "./lib/vault-ops";
import { getVaultState, useVault } from "./lib/vault-store";

interface ScannedEntry {
  input: NewAccountInput;
  payload: string;
}

export default function ScanQr() {
  const vault = useVault();
  const [entries, setEntries] = useState<ScannedEntry[]>([]);
  const [status, setStatus] = useState<"scanning" | "ready" | "empty">("scanning");
  const newInputs = new Set(deduplicateImports(entries.map((entry) => entry.input), vault.accounts).newAccounts);

  useEffect(() => {
    let active = true;
    void (async () => {
      const imagePath = await captureScreenToTempFile();
      if (!active) return;
      if (!imagePath) {
        await showToast({ style: Toast.Style.Failure, title: t("Screenshot cancelled", "已取消截屏") });
        await popToRoot();
        return;
      }
      try {
        const payloads = await detectBarcodes(imagePath);
        const found: ScannedEntry[] = [];
        for (const payload of payloads) {
          const bundle = parseImportBundle(payload);
          for (const input of bundle?.accounts ?? []) found.push({ input, payload });
        }
        if (!active) return;
        setEntries(found);
        setStatus(found.length > 0 ? "ready" : "empty");
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: t("Scan Failed", "识别失败"),
          message: error instanceof Error ? error.message : String(error),
        });
        setStatus("empty");
      } finally {
        try {
          unlinkSync(imagePath);
        } catch {
          /* 临时文件可能已被系统清理 */
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const importEntries = async (chosen: ScannedEntry[]) => {
    if (chosen.length === 0) return;
    const inputs = chosen.map((entry) => entry.input);
    const preview = deduplicateImports(inputs, getVaultState().accounts);
    if (!preview.newAccounts.length) {
      await showToast({ style: Toast.Style.Success, title: t("Accounts Already Exist", "账户已存在"), message: t("No duplicate accounts were imported.", "未重复导入账户。") });
      return;
    }
    const ok = await commit(
      (snapshot) => addAccounts(snapshot, deduplicateImports(inputs, snapshot.accounts).newAccounts, null),
      t(`Imported ${preview.newAccounts.length} accounts (${preview.dupeCount} skipped)`, `已导入 ${preview.newAccounts.length} 个账户（跳过 ${preview.dupeCount} 个重复项）`),
    );
    if (ok) await popToRoot();
  };

  return (
    <List isLoading={status === "scanning" || vault.syncStatus === "writing"} searchBarPlaceholder={t("Search scan results", "搜索识别结果")}>
      {status === "empty" ? (
        <List.Item
          icon={Icon.MagnifyingGlass}
          title={t("No QR Code Found", "没有识别到二维码")}
          subtitle={t("No parseable otpauth code in the captured area", "截屏区域里没有可解析的 otpauth 码")}
          actions={
            <ActionPanel>
              <Action title={t("Capture Again", "重新截屏")} icon={Icon.Camera} onAction={() => void popToRoot()} />
            </ActionPanel>
          }
        />
      ) : null}
      {entries.map((entry, index) => (
        <List.Item
          key={`${entry.input.name}-${index}`}
          icon={Icon.Key}
          title={entry.input.name}
          subtitle={entry.input.issuer}
          accessories={[{ text: newInputs.has(entry.input) ? entry.input.type.toUpperCase() : t("Already Added", "已存在") }]}
          actions={
            <ActionPanel>
              <Action title={t("Import This Account", "导入这个账户")} icon={Icon.Download} onAction={() => void importEntries([entry])} />
              <Action title={t("Import All", "导入全部")} icon={Icon.Download} onAction={() => void importEntries(entries)} />
              <Action.CopyToClipboard title={t("Copy QR Content", "复制二维码内容")} content={entry.payload} />
            </ActionPanel>
          }
        />
      ))}
      {status === "ready" ? (
        <List.Item
          icon={Icon.Download}
          title={t(`Import All ${entries.length} Accounts`, `导入全部 ${entries.length} 个账户`)}
          actions={
            <ActionPanel>
              <Action title={t("Import All", "导入全部")} icon={Icon.Download} onAction={() => void importEntries(entries)} />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
