import { Action, getPreferenceValues, Icon, Keyboard, List, showHUD } from "@raycast/api";
import { copyHistoryItem, pasteHistoryItem } from "../lib/bridge";
import type { HistoryItem, Preferences } from "../lib/types";

/** Render text as a code block, with a fence longer than any backtick run inside it. */
export function codeBlock(text: string) {
  const longest = Math.max(2, ...(text.match(/`+/g) ?? []).map((m) => m.length));
  const fence = "`".repeat(longest + 1);
  return `${fence}\n${text}\n${fence}`;
}

export function firstLine(text: string, max = 80) {
  const line = text.trim().split(/\r?\n/)[0] ?? "";
  return line.length > max ? `${line.slice(0, max)}…` : line || "(Blank)";
}

export function lineCount(text: string) {
  return text.split(/\r?\n/).length;
}

/** Paste or copy plain text (snippets). The primary action follows the preference. */
export function PasteOrCopyActions({ content, title }: { content: string; title?: string }) {
  const { primaryAction } = getPreferenceValues<Preferences>();
  const paste = <Action.Paste key="paste" title="Paste" content={content} />;
  const copy = (
    <Action.CopyToClipboard
      key="copy"
      title="Copy"
      content={content}
      shortcut={primaryAction === "paste" ? Keyboard.Shortcut.Common.Copy : undefined}
    />
  );
  const actions = primaryAction === "copy" ? [copy, paste] : [paste, copy];
  return (
    <>
      {actions}
      {title ? (
        <Action.CopyToClipboard title="Copy Title" content={title} shortcut={Keyboard.Shortcut.Common.CopyName} />
      ) : null}
    </>
  );
}

const COLOR_RE = /^\s*#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\s*$/;

export function historyIcon(item: HistoryItem) {
  if (item.kind === "image") return item.imagePath ? { source: item.imagePath } : Icon.Image;
  if (item.kind === "file") return Icon.Document;
  if (COLOR_RE.test(item.text)) {
    const hex = item.text.trim().replace(/^#/, "");
    return { source: Icon.CircleFilled, tintColor: `#${hex}` };
  }
  return item.html || item.rtf ? Icon.TextInput : Icon.Clipboard;
}

function kindLabel(item: HistoryItem) {
  if (item.kind === "image") return "Image";
  if (item.kind === "file") return "File";
  return item.html || item.rtf ? "Rich Text" : "Text";
}

export function historyDetail(item: HistoryItem) {
  let markdown: string;
  if (item.kind === "image" && item.imagePath) markdown = `![](${encodeURI(`file://${item.imagePath}`)})`;
  else if (item.kind === "file") markdown = (item.files ?? [item.text]).map((f) => `- \`${f}\``).join("\n");
  else markdown = codeBlock(item.text);
  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Type" text={kindLabel(item)} />
          {item.app ? <List.Item.Detail.Metadata.Label title="Source" text={item.app} /> : null}
          <List.Item.Detail.Metadata.Label title="Copied" text={new Date(item.copiedAt).toLocaleString()} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

/** History items: paste through the helper so every pasteboard type is restored. */
export function HistoryPasteActions({ item }: { item: HistoryItem }) {
  const { primaryAction } = getPreferenceValues<Preferences>();
  const paste = <Action key="paste" title="Paste" icon={Icon.Clipboard} onAction={() => pasteHistoryItem(item)} />;
  const copy = (
    <Action
      key="copy"
      title="Copy"
      icon={Icon.CopyClipboard}
      shortcut={primaryAction === "paste" ? Keyboard.Shortcut.Common.Copy : undefined}
      onAction={async () => {
        await copyHistoryItem(item);
        await showHUD("Copied to clipboard");
      }}
    />
  );
  const actions = primaryAction === "copy" ? [copy, paste] : [paste, copy];
  return (
    <>
      {actions}
      <Action
        title="Paste as Plain Text"
        icon={Icon.Text}
        shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
        onAction={() => pasteHistoryItem(item, true)}
      />
    </>
  );
}
