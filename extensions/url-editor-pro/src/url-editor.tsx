import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  Detail,
  open,
  Keyboard,
  Clipboard,
  Image,
  Alert,
  confirmAlert,
  Color,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { getFavicon, showFailureToast, useCachedState } from "@raycast/utils";
import QRCode from "qrcode";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { EditUrlForm } from "./edit-url-form";
import { ParseResult } from "./types";

function getItemId(item: ParseResult) {
  return item.href + "#$#" + item.alias;
}

function getItemIdFromId(id: string) {
  const [href, alias] = id.split("#$#");
  return { href, alias };
}

function parseUrl(url: string): ParseResult | undefined {
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

function buildUrl({ protocol, hostname, path, query, hash }: ParseResult) {
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

function renderQrMarkdown(qr: string, url?: string) {
  const size = "320";
  return (
    `<img src="${qr}" width="${size}" height="${size}" />` +
    (url ? `\nFull URL ↓: \n\n \`\`\`\n${url}\n\`\`\`` + `\n - length: ${url.length}` : "")
  );
}

function isURLLike(url: string) {
  const reg = /^[a-zA-Z]+:\/\/.+/gi;
  return reg.test(url.trim());
}

function QrDetail({ qr, url }: { qr: string; url: ParseResult | null }) {
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

export default function Command() {
  const [history, setHistory] = useCachedState<ParseResult[]>("url-history", []);
  const [input, setInput] = useState("");
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());
  const [filteredHistory, setFilteredHistory] = useState<ParseResult[]>(history);
  const [clipboardUrl, setClipboardUrl] = useState<string>("");

  useEffect(() => {
    async function readClipboard() {
      try {
        const { text } = await Clipboard.read();
        const trimmedText = text.trim();
        if (isURLLike(trimmedText)) {
          setClipboardUrl(trimmedText);
        }
      } catch (e) {
        console.error("Failed to read clipboard:", e);
      }
    }
    readClipboard();
  }, []);

  useEffect(() => {
    if (!input.trim()) {
      setFilteredHistory(history);
    } else {
      setFilteredHistory(
        history.filter(
          (item) =>
            item?.href?.toLowerCase().includes(input.trim().toLowerCase()) ||
            (item?.alias && item.alias.toLowerCase().includes(input.trim().toLowerCase())),
        ),
      );
    }
  }, [input, history]);

  async function handleClear() {
    await confirmAlert({
      title: "Sure to clear history?",
      message: "This action can't be reverted",
      icon: { source: Icon.MinusCircle, tintColor: Color.Red },
      primaryAction: {
        title: "Yes",
        style: Alert.ActionStyle.Destructive,
        onAction: () => {
          setHistory([]);
        },
      },
      rememberUserChoice: true,
    });
  }

  async function generateQrCode(url: string) {
    if (!qrCodes[url]) {
      try {
        const qr = await QRCode.toDataURL(url);
        setQrCodes((prev) => ({ ...prev, [url]: qr }));
      } catch (e) {
        console.error("Failed to generate QR code:", e);
      }
    }
  }

  useEffect(() => {
    visibleItems.forEach((id) => {
      const { href } = getItemIdFromId(id);
      generateQrCode(href);
    });
  }, [visibleItems]);

  function handleDeleteFromHistory(id: string) {
    setHistory((prev) => prev.filter((item) => getItemId(item) !== id));
  }

  function handleSaveToHistory(parsed: ParseResult) {
    setHistory((prev) => {
      const filtered = prev.filter((item) => getItemId(item) !== getItemId(parsed));
      return [parsed, ...filtered];
    });
  }

  const showClipboardUrl = useMemo(() => clipboardUrl && !input && isURLLike(clipboardUrl), [clipboardUrl, input]);

  const selectedItemId = useMemo(() => {
    const target = input || clipboardUrl;
    if (!target) return undefined;
    const item = history.find((item) => item.href === target);
    if (item) {
      return getItemId(item);
    }
    return undefined;
  }, [history, input, clipboardUrl]);

  return (
    <List
      searchBarPlaceholder="Paste or type your URL..."
      searchText={input}
      onSearchTextChange={(v) => setInput(v.trim())}
      isShowingDetail
      onSelectionChange={(id) => {
        if (id && id !== "input-form") {
          setVisibleItems((prev) => new Set([...prev, id]));
        }
      }}
      selectedItemId={selectedItemId}
    >
      <List.Item
        id="input-form"
        title={input || clipboardUrl || "Input/Copy URL"}
        icon={Icon.Pencil}
        detail={
          <List.Item.Detail
            markdown={
              showClipboardUrl
                ? `URL detected in clipboard:\n\n\`\`\`\n${clipboardUrl}\n\`\`\`\n\n**Press Enter to paste and parse**`
                : isURLLike(input)
                  ? `**Press Enter to parse and Edit** \n\n \`\`\`\n${input}\n\`\`\``
                  : "Enter URL to parse and edit"
            }
          />
        }
        actions={
          <ActionPanel>
            {showClipboardUrl ? (
              <Action.Push
                title="Paste and Parse"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                target={
                  <EditUrlForm
                    url={{
                      href: clipboardUrl,
                    }}
                    onSave={handleSaveToHistory}
                  />
                }
              />
            ) : isURLLike(input) ? (
              <Action.Push
                title="Parse and Edit"
                icon={Icon.MagnifyingGlass}
                target={
                  <EditUrlForm
                    url={{
                      href: input,
                    }}
                    onSave={handleSaveToHistory}
                  />
                }
              />
            ) : null}

            {history.length > 0 && (
              <Action
                title="Clear History"
                icon={Icon.MinusCircle}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.RemoveAll}
                onAction={handleClear}
              />
            )}
          </ActionPanel>
        }
      />
      {/* history */}
      {filteredHistory.map((item) => (
        <List.Item
          id={getItemId(item)}
          key={getItemId(item)}
          title={item.alias ? `[${item.alias}]` : item.href || ""}
          subtitle={item.alias ? item.href : undefined}
          icon={getFavicon(item.href || "", { mask: Image.Mask.Circle, fallback: Icon.Clock })}
          detail={
            <List.Item.Detail
              markdown={
                qrCodes[item?.href || ""]
                  ? renderQrMarkdown(qrCodes[item.href || ""], item.href) +
                    `\n\n\`\`\`json\n${JSON.stringify(item, null, 2)}\n\`\`\``
                  : "Generating QR code..."
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit This URL"
                icon={Icon.Pencil}
                target={<EditUrlForm url={item} onSave={handleSaveToHistory} />}
              />
              <Action.CopyToClipboard content={item.href || ""} title="Copy URL" />

              <Action
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                title="Delete from History"
                onAction={() => handleDeleteFromHistory(getItemId(item))}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export { QrDetail, buildUrl, parseUrl };
