import { Action, ActionPanel, Detail, Icon, environment } from "@raycast/api";
import { useEffect, useState } from "react";
import { accountExportHeadingDataUrl, accountQrDataUrl, accountSetupUri } from "./lib/account-export";
import { t } from "./lib/i18n";
import { useVaultSnapshot } from "./lib/vault-store";

export function AccountExportAction({ accountId, saved = false }: { accountId: string; saved?: boolean }) {
  return (
    <Action.Push
      title={saved ? t("Export Saved Account", "导出已保存账户") : t("Export Account", "导出账户")}
      icon={Icon.Upload}
      target={<ExportAccount accountId={accountId} />}
    />
  );
}

function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_{}[\]()<>#+.!|~-]/g, "\\$&").replace(/[\r\n]+/g, " ");
}

export default function ExportAccount({ accountId }: { accountId: string }) {
  const vault = useVaultSnapshot();
  const account = vault.status === "ready" ? vault.accounts.find((item) => item.id === accountId) : undefined;
  const uri = account ? accountSetupUri(account) : undefined;
  const [showText, setShowText] = useState(false);
  const [qr, setQr] = useState<{ uri: string; dataUrl?: string; failed?: boolean } | null>(null);
  // Never render an old result while a changed account's QR is being generated.
  const currentQr = qr?.uri === uri ? qr : null;

  useEffect(() => {
    if (!uri) return;
    let active = true;
    void accountQrDataUrl(uri).then(
      (dataUrl) => {
        if (active) setQr({ uri, dataUrl });
      },
      () => {
        if (active) setQr({ uri, failed: true });
      },
    );
    return () => {
      active = false;
    };
  }, [uri]);

  if (!account || !uri) {
    return (
      <Detail
        navigationTitle={t("Export Account", "导出账户")}
        isLoading={vault.status === "loading"}
        markdown={vault.status === "loading" ? "" : t("Account is no longer available.", "账户已不可用。")}
      />
    );
  }

  const heading = showText
    ? `## ${escapeMarkdown(account.issuer || account.name)}\n\n${account.issuer ? escapeMarkdown(account.name) : ""}`
    : `![${escapeMarkdown([account.issuer, account.name].filter(Boolean).join(" · "))}](${accountExportHeadingDataUrl(account, environment.theme)}?raycast-width=520&raycast-height=52)`;
  const body = showText
    ? `## ${t("Setup Link", "导入链接")}\n\n\`\`\`text\n${uri}\n\`\`\`\n\n## ${t("Base32 Secret", "Base32 密钥")}\n\n\`\`\`text\n${account.secret}\n\`\`\``
    : currentQr?.dataUrl
      ? `![${t("Account QR Code", "账户二维码")}](${currentQr.dataUrl}?raycast-width=240&raycast-height=240)`
      : currentQr?.failed
        ? t(
            "QR code could not be generated. Copy the setup link or secret instead.",
            "无法生成二维码，可复制导入链接或密钥。",
          )
        : "";

  return (
    <Detail
      navigationTitle={t("Export Account", "导出账户")}
      isLoading={!showText && !currentQr}
      markdown={`${heading}\n\n${body}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title={t("Copy Setup Link", "复制导入链接")}
            icon={Icon.Link}
            content={uri}
            concealed
          />
          <Action.CopyToClipboard
            title={t("Copy Secret", "复制密钥")}
            icon={Icon.Key}
            content={account.secret}
            concealed
          />
          <Action
            title={showText ? t("Show QR Code", "显示二维码") : t("Show Setup Text", "显示导入文本")}
            icon={showText ? Icon.Image : Icon.Text}
            onAction={() => setShowText((value) => !value)}
          />
        </ActionPanel>
      }
    />
  );
}
