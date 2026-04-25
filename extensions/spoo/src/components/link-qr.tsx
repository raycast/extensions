import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Icon,
  Toast,
  showToast,
} from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useEffect, useState } from "react";
import { writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { environment } from "@raycast/api";
import QRCode from "qrcode";
import { QR_DARK, QR_LIGHT, markdownImage, toDataUrl } from "@/lib/qrcode";
import { formatRelative } from "@/lib/format";
import { getStatusMeta } from "@/lib/status";
import { reportError } from "@/lib/errors";
import type { UrlListItem } from "@/schemas/url";

const QR_PREVIEW_SIZE = 200;
const QR_EXPORT_SIZE = 1024;

export function LinkQrView({ link }: { link: UrlListItem }) {
  const alias = link.alias ?? link.id;
  const destinationHost = link.long_url ? safeHostname(link.long_url) : null;
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    const appearance = environment.appearance === "dark" ? "dark" : "light";
    toDataUrl(link.short_url, QR_PREVIEW_SIZE, true, appearance).then(
      setQrDataUrl,
    );
  }, [link.short_url]);

  const markdown = qrDataUrl
    ? [
        "# 🎉 Your link is ready",
        "",
        `## ${link.short_url}`,
        "",
        markdownImage(qrDataUrl, link.short_url),
      ].join("\n")
    : "";

  const saveQr = async () => {
    try {
      const path = join(homedir(), "Downloads", `spoo-${alias}.png`);
      await QRCode.toFile(path, link.short_url, {
        width: QR_EXPORT_SIZE,
        margin: 2,
        errorCorrectionLevel: "H",
        color: { dark: QR_DARK, light: QR_LIGHT },
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Saved QR to Downloads",
        message: `spoo-${alias}.png`,
      });
    } catch (err) {
      await reportError(err);
    }
  };

  const copyQrImage = async () => {
    try {
      const path = join(tmpdir(), `spoo-${alias}.png`);
      const buffer = await QRCode.toBuffer(link.short_url, {
        width: QR_EXPORT_SIZE,
        margin: 2,
        errorCorrectionLevel: "H",
        color: { dark: QR_DARK, light: QR_LIGHT },
      });
      await writeFile(path, buffer);
      await Clipboard.copy({ file: path });
      await showToast({ style: Toast.Style.Success, title: "Copied QR image" });
    } catch (err) {
      await reportError(err);
    }
  };

  return (
    <Detail
      isLoading={!qrDataUrl}
      markdown={markdown}
      navigationTitle={`QR · ${alias}`}
      metadata={
        <Detail.Metadata>
          {link.long_url && destinationHost ? (
            <Detail.Metadata.Label
              title="Site"
              icon={getFavicon(link.long_url, { fallback: Icon.Globe })}
              text={destinationHost}
            />
          ) : null}
          <Detail.Metadata.Link
            title="Short URL"
            target={link.short_url}
            text={link.short_url}
          />
          {link.long_url ? (
            <Detail.Metadata.Link
              title="Long URL"
              target={link.long_url}
              text={link.long_url}
            />
          ) : null}
          <Detail.Metadata.Separator />
          {(() => {
            const status = getStatusMeta(link.status);
            return (
              <Detail.Metadata.Label
                title="Status"
                icon={{ source: status.icon, tintColor: status.tintColor }}
                text={status.label}
              />
            );
          })()}
          {link.created_at ? (
            <Detail.Metadata.Label
              title="Created"
              text={formatRelative(link.created_at)}
            />
          ) : null}
          {link.expire_after ? (
            <Detail.Metadata.Label
              title="Expires"
              icon={Icon.Clock}
              text={formatRelative(link.expire_after)}
            />
          ) : null}
          {link.max_clicks ? (
            <Detail.Metadata.Label
              title="Max clicks"
              text={`0 / ${link.max_clicks}`}
            />
          ) : null}
          {link.password_set || link.block_bots || link.private_stats ? (
            <Detail.Metadata.TagList title="Flags">
              {link.password_set ? (
                <Detail.Metadata.TagList.Item
                  text="Password"
                  color={Color.Yellow}
                  icon={Icon.Lock}
                />
              ) : null}
              {link.block_bots ? (
                <Detail.Metadata.TagList.Item
                  text="Block bots"
                  color={Color.Purple}
                />
              ) : null}
              {link.private_stats ? (
                <Detail.Metadata.TagList.Item
                  text="Private stats"
                  color={Color.Blue}
                />
              ) : null}
            </Detail.Metadata.TagList>
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Short URL"
            content={link.short_url}
            icon={Icon.Clipboard}
          />
          <Action.OpenInBrowser title="Open Short URL" url={link.short_url} />
          <ActionPanel.Section title="QR">
            <Action
              title="Save Qr to Downloads"
              icon={Icon.Download}
              onAction={saveQr}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
            <Action
              title="Copy Qr Image"
              icon={Icon.CopyClipboard}
              onAction={copyQrImage}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function safeHostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
