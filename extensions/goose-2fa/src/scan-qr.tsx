import {
  Action,
  ActionPanel,
  Form,
  Icon,
  LaunchType,
  List,
  Toast,
  launchCommand,
  showToast,
  useNavigation,
} from "@raycast/api";
import { randomUUID } from "node:crypto";
import { statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { useEffect, useState } from "react";
import { deduplicateImports, parseImportBundle } from "../vendor/lib/data-transfer";
import type { NewAccountInput } from "../vendor/lib/types";
import AccountForm from "./account-form";
import { captureScreenToTempFile, detectBarcodes } from "./lib/helper";
import { t } from "./lib/i18n";
import { useVaultSnapshot } from "./lib/vault-store";

export interface ScanResult {
  id: string;
  entries: NewAccountInput[];
  source: "screen" | "image";
  error?: string;
}

export default function ScanQr({ source = "screen", result }: { source?: "screen" | "image"; result?: ScanResult }) {
  const vault = useVaultSnapshot();
  const { pop } = useNavigation();
  const [entries, setEntries] = useState<NewAccountInput[]>(result?.entries ?? []);
  const [status, setStatus] = useState<"selecting" | "scanning" | "ready" | "empty">(
    result ? (result.entries.length ? "ready" : "empty") : source === "image" ? "selecting" : "scanning",
  );
  const newInputs = new Set(deduplicateImports(entries, vault.accounts).newAccounts);

  async function readScan(imagePath: string): Promise<ScanResult> {
    const id = randomUUID();
    try {
      return {
        id,
        entries: (await detectBarcodes(imagePath)).flatMap((payload) => parseImportBundle(payload)?.accounts ?? []),
        source,
      };
    } catch (error) {
      return { id, entries: [], source, error: error instanceof Error ? error.message : String(error) };
    }
  }

  function showResult(next: ScanResult) {
    setEntries(next.entries);
    setStatus(next.entries.length ? "ready" : "empty");
  }

  async function reopen(next?: ScanResult) {
    try {
      await launchCommand({
        name: "codes",
        type: LaunchType.UserInitiated,
        context: next ? { scanResult: next } : undefined,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("Could Not Reopen Goose 2FA", "无法重新打开 Goose 2FA"),
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  useEffect(() => {
    if (result?.error)
      void showToast({ style: Toast.Style.Failure, title: t("Scan Failed", "识别失败"), message: result.error });
  }, [result?.error]);

  useEffect(() => {
    if (source !== "screen" || result) return;
    let active = true;
    void (async () => {
      const imagePath = await captureScreenToTempFile();
      let next: ScanResult | undefined;
      try {
        if (imagePath && active) next = await readScan(imagePath);
      } finally {
        // Clean up before relaunching, which can terminate the current command.
        if (imagePath)
          try {
            unlinkSync(imagePath);
          } catch {
            /* System may have removed the temporary screenshot. */
          }
      }
      if (!active) return;
      if (next) showResult(next);
      else pop();
      await reopen(next);
    })();
    return () => {
      active = false;
    };
    // ponytail: one capture per mounted scanner; a new scan is a new navigation, not a reactive effect.
  }, []);

  const singleInput = entries.length === 1 ? entries[0] : undefined;
  if (status === "ready" && vault.status === "ready" && singleInput && newInputs.has(singleInput)) {
    return <AccountForm mode="create" initial={singleInput} />;
  }

  if (status === "selecting")
    return (
      <Form
        navigationTitle={t("Import QR Image", "从图片识码")}
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title={t("Scan Image", "识别图片")}
              onSubmit={async (values: { files?: string[] }) => {
                const file = values.files?.[0];
                if (!file) {
                  await showToast({ style: Toast.Style.Failure, title: t("Choose an image", "请选择图片") });
                  return;
                }
                try {
                  const stat = statSync(file);
                  if (
                    !stat.isFile() ||
                    !stat.size ||
                    stat.size > 5 * 1024 * 1024 ||
                    ![".png", ".jpg", ".jpeg", ".heic", ".heif"].includes(path.extname(file).toLowerCase())
                  )
                    throw new Error();
                } catch {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: t("Invalid image", "图片无效"),
                    message: t(
                      "Choose a PNG, JPEG or HEIC image under 5 MB.",
                      "请选择小于 5 MB 的 PNG、JPEG 或 HEIC 图片。",
                    ),
                  });
                  return;
                }
                setStatus("scanning");
                const next = await readScan(file);
                showResult(next);
                await reopen(next);
              }}
            />
          </ActionPanel>
        }
      >
        <Form.FilePicker id="files" title={t("QR Image", "二维码图片")} allowMultipleSelection={false} />
      </Form>
    );

  return (
    <List
      isLoading={status === "scanning" || vault.syncStatus === "writing"}
      searchBarPlaceholder={t("Search scan results", "搜索识别结果")}
    >
      {status === "empty" && (
        <List.Item
          icon={Icon.MagnifyingGlass}
          title={t("No QR Code Found", "没有识别到二维码")}
          subtitle={t("No supported account was found in the image.", "图片中没有可识别的账户。")}
          actions={
            <ActionPanel>
              {source === "image" ? (
                <Action
                  title={t("Choose Another Image", "选择另一张图片")}
                  icon={Icon.Upload}
                  onAction={() => setStatus("selecting")}
                />
              ) : (
                <Action title={t("Back to Codes", "返回验证码")} icon={Icon.ArrowLeft} onAction={pop} />
              )}
            </ActionPanel>
          }
        />
      )}
      {entries.map((input, index) => (
        <List.Item
          key={`${input.name}-${index}`}
          icon={Icon.Key}
          title={input.name}
          subtitle={input.issuer}
          accessories={[{ text: newInputs.has(input) ? input.type.toUpperCase() : t("Already Added", "已存在") }]}
          actions={
            <ActionPanel>
              <Action.Push
                title={t("Edit and Save Account", "编辑并保存账户")}
                icon={Icon.Pencil}
                target={<AccountForm mode="create" initial={input} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
