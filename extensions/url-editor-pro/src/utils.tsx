import { Action, ActionPanel, Detail } from "@raycast/api";
import path from "path";
import fs from "fs";
import os from "os";
import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ParseResult } from "./types";

export function parseUrl(url: string): ParseResult | undefined {
  try {
    const { href, protocol, hostname, port, origin, hash, pathname: path, searchParams: queries } = new URL(url);
    return {
      href,
      protocol,
      hostname,
      port,
      origin,
      hash,
      path: decodeURIComponent(path),
      query: Object.fromEntries(queries),
    };
  } catch (e) {
    console.error("error", e, url);
    return undefined;
  }
}

export function buildUrl({ protocol, hostname, path, query, hash }: ParseResult) {
  const urlParts = [protocol ? protocol + "//" : "", hostname || "", path || "/"];
  const queryStr = Object.entries(query || {})
    .filter(([k]) => k)
    .map(([k, v]) => {
      if (!v) return "";
      return `${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
    })
    .filter(Boolean)
    .join("&");
  if (queryStr) {
    urlParts.push("?" + queryStr);
  }
  if (hash) {
    urlParts.push(hash);
  }
  return urlParts.join("");
}

export function renderQrMarkdown(qr: string, url?: string) {
  const size = "320";
  return (
    `<img src="${qr}" width="${size}" height="${size}" />` +
    (url ? `\nFull URL ↓: \n\n \`\`\`\n${url}\n\`\`\`` + `\n - length: ${url.length}` : "")
  );
}

export function isURLLike(url: string) {
  try {
    new URL(url.trim());
    return true;
  } catch {
    return false;
  }
}

export function QrDetail({ qr, url }: { qr: string; url: ParseResult | null }) {
  async function handleSaveQr() {
    if (!url) return;
    try {
      const base64 = qr.replace(/^data:image\/png;base64,/, "");
      const filePath = path.join(
        os.homedir(),
        "Downloads",
        `qr_${url.protocol?.split(":")[0]}_${url.hostname}_${new Date().toISOString().split("T")[0].replace(/-/g, "_")}.png`,
      );
      fs.writeFileSync(filePath, base64, "base64");
      showToast({ style: Toast.Style.Success, title: "Saved to Downloads", message: filePath });
      await open(filePath);
    } catch (error) {
      console.error(error);
      showFailureToast(error, { title: "Failed to save QR code" });
    }
  }

  return (
    <Detail
      markdown={url?.href ? renderQrMarkdown(qr, url.href) : ""}
      actions={
        url?.href ? (
          <ActionPanel>
            <Action.CopyToClipboard content={url.href} title="Copy URL" />
            <Action title="Save Qr Code to Downloads" onAction={handleSaveQr} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
