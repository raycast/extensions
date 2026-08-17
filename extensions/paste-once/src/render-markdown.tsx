import { Action, ActionPanel, Clipboard, Detail, Keyboard, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { renderMarkdown } from "./lib/markdown-render";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [source, setSource] = useState<string>();
  const [html, setHtml] = useState<string>();
  const [plain, setPlain] = useState<string>();
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const text = (await Clipboard.readText())?.trim() ?? "";
      if (cancelled) return;

      if (!text) {
        setMessage("Copy markdown first, then run Render Markdown.");
        setIsLoading(false);
        return;
      }

      const rendered = renderMarkdown(text);
      setSource(rendered.prepared);
      setHtml(rendered.html);
      setPlain(rendered.text);
      setIsLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function copyFormatted() {
    if (!html || !plain) return;
    await Clipboard.copy({ html, text: plain });
    await showHUD("Copied formatted text");
  }

  async function pasteFormatted() {
    if (!html || !plain) return;
    await Clipboard.paste({ html, text: plain });
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={source ?? (message ? `*${message}*` : undefined)}
      actions={
        html && plain ? (
          <ActionPanel>
            <Action title="Copy Formatted Text" shortcut={Keyboard.Shortcut.Common.Copy} onAction={copyFormatted} />
            <Action
              title="Paste in Active App"
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "v" },
                Windows: { modifiers: ["ctrl", "shift"], key: "v" },
              }}
              onAction={pasteFormatted}
            />
            <Action
              title="Copy Plain Text"
              onAction={async () => {
                await Clipboard.copy(plain);
                await showToast({ style: Toast.Style.Success, title: "Copied plain text" });
              }}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
