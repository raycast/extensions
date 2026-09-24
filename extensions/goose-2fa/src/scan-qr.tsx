import { Action, ActionPanel, Icon, List, Toast, popToRoot, showToast } from "@raycast/api";
import { unlinkSync } from "node:fs";
import { useEffect, useState } from "react";
import { deduplicateImports, parseImportBundle } from "../vendor/lib/data-transfer";
import type { NewAccountInput } from "../vendor/lib/types";
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
        await showToast({ style: Toast.Style.Failure, title: "Screenshot cancelled" });
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
          title: "Scan Failed",
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
      await showToast({ style: Toast.Style.Success, title: "Accounts Already Exist", message: "No duplicate accounts were imported." });
      return;
    }
    const ok = await commit(
      (snapshot) => addAccounts(snapshot, deduplicateImports(inputs, snapshot.accounts).newAccounts, null),
      `Imported ${preview.newAccounts.length} accounts (${preview.dupeCount} skipped)`,
    );
    if (ok) await popToRoot();
  };

  return (
    <List isLoading={status === "scanning" || vault.syncStatus === "writing"} searchBarPlaceholder={"Search scan results"}>
      {status === "empty" ? (
        <List.Item
          icon={Icon.MagnifyingGlass}
          title={"No QR Code Found"}
          subtitle={"No parseable otpauth code in the captured area"}
          actions={
            <ActionPanel>
              <Action title={"Capture Again"} icon={Icon.Camera} onAction={() => void popToRoot()} />
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
          accessories={[{ text: newInputs.has(entry.input) ? entry.input.type.toUpperCase() : "Already Added" }]}
          actions={
            <ActionPanel>
              <Action title={"Import This Account"} icon={Icon.Download} onAction={() => void importEntries([entry])} />
              <Action title={"Import All"} icon={Icon.Download} onAction={() => void importEntries(entries)} />
              <Action.CopyToClipboard title={"Copy QR Content"} content={entry.payload} />
            </ActionPanel>
          }
        />
      ))}
      {status === "ready" ? (
        <List.Item
          icon={Icon.Download}
          title={`Import All ${entries.length} Accounts`}
          actions={
            <ActionPanel>
              <Action title={"Import All"} icon={Icon.Download} onAction={() => void importEntries(entries)} />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
