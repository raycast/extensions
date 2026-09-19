import { Action, ActionPanel, Icon, List, Toast, popToRoot, showToast } from "@raycast/api";
import { unlinkSync } from "node:fs";
import { useEffect, useState } from "react";
import { parseImportBundle } from "../../src/lib/data-transfer";
import type { NewAccountInput } from "../../src/lib/types";
import { commit } from "./lib/commit";
import { captureScreenToTempFile, detectBarcodes } from "./lib/helper";
import { addAccounts } from "./lib/vault-ops";
import { useVault } from "./lib/vault-store";

interface ScannedEntry {
  input: NewAccountInput;
  payload: string;
}

export default function ScanQr() {
  const vault = useVault();
  const [entries, setEntries] = useState<ScannedEntry[]>([]);
  const [status, setStatus] = useState<"scanning" | "ready" | "empty">("scanning");

  useEffect(() => {
    let active = true;
    void (async () => {
      const imagePath = await captureScreenToTempFile();
      if (!active) return;
      if (!imagePath) {
        await showToast({ style: Toast.Style.Failure, title: "已取消截屏" });
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
          title: "识别失败",
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
    const ok = await commit(
      (snapshot) => addAccounts(snapshot, chosen.map((entry) => entry.input), null),
      `已导入 ${chosen.length} 个账户`,
    );
    if (ok) await popToRoot();
  };

  return (
    <List isLoading={status === "scanning" || vault.syncStatus === "writing"} searchBarPlaceholder="搜索识别结果">
      {status === "empty" ? (
        <List.Item
          icon={Icon.MagnifyingGlass}
          title="没有识别到二维码"
          subtitle="截屏区域里没有可解析的 otpauth 码"
          actions={
            <ActionPanel>
              <Action title="重新截屏" icon={Icon.Camera} onAction={() => void popToRoot()} />
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
          accessories={[{ text: entry.input.type.toUpperCase() }]}
          actions={
            <ActionPanel>
              <Action title="导入这个账户" icon={Icon.Download} onAction={() => void importEntries([entry])} />
              <Action title="导入全部" icon={Icon.Download} onAction={() => void importEntries(entries)} />
              <Action.CopyToClipboard title="复制二维码内容" content={entry.payload} />
            </ActionPanel>
          }
        />
      ))}
      {status === "ready" ? (
        <List.Item
          icon={Icon.Download}
          title={`导入全部 ${entries.length} 个账户`}
          actions={
            <ActionPanel>
              <Action title="导入全部" icon={Icon.Download} onAction={() => void importEntries(entries)} />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
