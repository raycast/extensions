import { ActionPanel, Action, List, Icon, Keyboard, Clipboard, Image, Alert, confirmAlert, Color } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { getFavicon, useCachedState } from "@raycast/utils";
import QRCode from "qrcode";
import { EditUrlForm } from "./editor/edit-url-form";
import { ParseResult, TemplateGroup } from "./types";
import { isURLLike, getItemId, getItemIdFromId } from "./utils";
import { renderQrMarkdown } from "./qrcode";
import { TemplateManager } from "./template/template-manager";
import { createVariantsView } from "./template/template-variants-helper";
import { DEFAULT_TEMPLATE_GROUPS } from "./template/template-group-config";
import { WELCOME_BRIEF, CLIPBOARD_DETECTED_BRIEF, URL_INPUT_BRIEF } from "./brief";

export default function Command() {
  const [history, setHistory] = useCachedState<ParseResult[]>("url-history", []);
  const [input, setInput] = useState("");
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());
  const [filteredHistory, setFilteredHistory] = useState<ParseResult[]>(history);
  const [clipboardUrl, setClipboardUrl] = useState<string>("");
  const [templateGroups] = useCachedState<TemplateGroup[]>("template-groups", DEFAULT_TEMPLATE_GROUPS);

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

  const templateEntryAction = useMemo(() => {
    return (
      <ActionPanel.Section title="Template">
        <Action.Push
          title="Manage Template"
          icon={Icon.Gear}
          target={<TemplateManager />}
          shortcut={{ modifiers: ["ctrl", "shift"], key: "t" }}
        />
      </ActionPanel.Section>
    );
  }, []);

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
                ? CLIPBOARD_DETECTED_BRIEF(clipboardUrl)
                : isURLLike(input)
                  ? URL_INPUT_BRIEF(input)
                  : WELCOME_BRIEF
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

            {isURLLike(input || clipboardUrl) && (
              <Action.Push
                title="Generate Variants"
                icon={Icon.Bolt}
                target={createVariantsView(input || clipboardUrl, templateGroups, handleSaveToHistory)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              />
            )}
            {history.length > 0 && (
              <Action
                title="Clear History"
                icon={Icon.MinusCircle}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.RemoveAll}
                onAction={handleClear}
              />
            )}
            {templateEntryAction}
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
              {item.href && (
                <Action.Push
                  title="Generate Variants"
                  icon={Icon.Bolt}
                  target={createVariantsView(item.href, templateGroups, handleSaveToHistory)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                />
              )}
              <Action
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                title="Delete from History"
                onAction={() => handleDeleteFromHistory(getItemId(item))}
              />
              {templateEntryAction}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
