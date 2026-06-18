import { useEffect, useRef, useState } from "react";
import { copyFileSync } from "fs";
import { homedir, tmpdir } from "os";
import { join } from "path";
import { Action, ActionPanel, Clipboard, Icon, List, getSelectedText, showToast, Toast } from "@raycast/api";
import { runSwiss } from "./swiss";
import { NotInstalled, useSwissInstalled } from "./not-installed";

export default function Command() {
  const [input, setInput] = useState("");
  const [png, setPng] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const counter = useRef(0);
  const installed = useSwissInstalled();

  // Prefill from the current selection, falling back to the clipboard.
  useEffect(() => {
    (async () => {
      try {
        const selected = await getSelectedText();
        if (selected?.trim()) {
          setInput(selected);
          return;
        }
      } catch {
        // no selection — try the clipboard
      }
      const clip = await Clipboard.readText();
      if (clip?.trim()) setInput(clip);
    })();
  }, []);

  useEffect(() => {
    const value = input;
    if (!value.trim()) {
      setPng(null);
      setError(null);
      setLoading(false);
      return;
    }
    const id = ++counter.current;
    const out = join(tmpdir(), `swiss-qr-${id}.png`);
    setLoading(true);
    runSwiss(["qr", "-v", "-", "-o", out, "--size", "512"], value)
      .then(() => {
        if (id !== counter.current) return;
        setPng(out);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (id !== counter.current) return;
        setError(err instanceof Error ? err.message : String(err));
        setPng(null);
        setLoading(false);
      });
  }, [input]);

  if (installed === false) return <NotInstalled />;

  const markdown = png
    ? `![QR Code](file://${png})`
    : error
      ? `**Could not generate a QR code**\n\n\`\`\`\n${error}\n\`\`\``
      : "Type or paste a value or URL to generate a QR code.";

  async function copyImage() {
    if (!png) return;
    await Clipboard.copy({ file: png });
    await showToast({ style: Toast.Style.Success, title: "Copied QR image" });
  }

  async function saveToDownloads() {
    if (!png) return;
    const dest = join(homedir(), "Downloads", "swiss-qr.png");
    copyFileSync(png, dest);
    await showToast({ style: Toast.Style.Success, title: "Saved to Downloads", message: dest });
  }

  return (
    <List
      isLoading={loading}
      filtering={false}
      searchText={input}
      onSearchTextChange={setInput}
      throttle
      isShowingDetail={input.trim().length > 0}
      searchBarPlaceholder="Type a value or URL to encode as a QR code…"
    >
      {!input.trim() ? (
        <List.EmptyView
          icon={Icon.QrCode}
          title="Generate a QR Code"
          description="Type or paste a value or URL. Generated locally with the swiss CLI."
        />
      ) : (
        <List.Item
          title="QR Code"
          subtitle={png ? "Scannable PNG" : error ? "Error" : "Generating…"}
          icon={Icon.QrCode}
          detail={<List.Item.Detail markdown={markdown} />}
          actions={
            <ActionPanel>
              {png && <Action title="Copy QR Image" icon={Icon.Clipboard} onAction={copyImage} />}
              {png && (
                <Action
                  title="Save to Downloads"
                  icon={Icon.Download}
                  onAction={saveToDownloads}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                />
              )}
              <Action.CopyToClipboard
                title="Copy Value"
                content={input}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
