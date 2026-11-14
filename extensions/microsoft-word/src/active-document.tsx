import { Action, ActionPanel, Clipboard, Detail, Icon, showToast, Toast, Keyboard } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { readActiveDocument, readText, setTrackChanges } from "./word";

export function textStats(text: string) {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const paragraphs = trimmed ? trimmed.split(/\n\s*\n|\n/).filter((line) => line.trim()).length : 0;
  return {
    words,
    characters: text.replace(/\n/g, "").length,
    paragraphs,
    readingMinutes: Math.max(1, Math.round(words / 230)),
  };
}

function escapeMarkdown(text: string) {
  return text.replace(/[\\`*_{}[\]()#+.!|>-]/g, "\\$&");
}

export default function Command() {
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const { data: doc, error, isLoading, revalidate } = usePromise(readActiveDocument);
  const { data: body, revalidate: revalidateBody } = usePromise(
    async (identity?: string) => (identity ? readText(identity) : undefined),
    [doc?.identity],
    {
      onError: () => undefined,
    },
  );
  async function refresh() {
    revalidate();
    revalidateBody();
  }
  const stats = body !== undefined ? textStats(body) : undefined;
  async function copyText(selection: boolean) {
    if (!doc || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await Clipboard.copy(await readText(doc.identity, selection));
      await showToast({ style: Toast.Style.Success, title: selection ? "Selection copied" : "Document text copied" });
    } catch (error) {
      await showFailureToast(error, { title: "Could not copy Word text" });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function toggle() {
    if (!doc || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const tracking = await setTrackChanges(doc.identity, !doc.tracking);
      await showToast({ style: Toast.Style.Success, title: `Track Changes ${tracking ? "on" : "off"}` });
      await revalidate();
    } catch (error) {
      await showFailureToast(error, { title: "Could not change Track Changes" });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  return (
    <Detail
      isLoading={isLoading || busy}
      markdown={
        doc
          ? `# ${escapeMarkdown(doc.name)}\n\n${
              stats
                ? `**${stats.words.toLocaleString()} words** · ${stats.characters.toLocaleString()} characters · ~${stats.readingMinutes} min read\n\n`
                : ""
            }${body ? `> ${escapeMarkdown(body.trim().slice(0, 600)).replace(/\n+/g, "\n>\n> ")}${body.trim().length > 600 ? "…" : ""}` : ""}`
          : error
            ? `# Microsoft Word\n\n${escapeMarkdown(error.message)}\n\nOpen a document in Word, then refresh. If macOS asks, allow Raycast to automate Microsoft Word in System Settings → Privacy & Security → Automation.`
            : ""
      }
      metadata={
        doc ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Location" text={doc.path || "Not saved"} />
            {stats ? (
              <>
                <Detail.Metadata.Label title="Words" text={stats.words.toLocaleString()} />
                <Detail.Metadata.Label title="Characters" text={stats.characters.toLocaleString()} />
                <Detail.Metadata.Label title="Paragraphs" text={stats.paragraphs.toLocaleString()} />
              </>
            ) : null}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Track Changes" text={doc.tracking ? "On" : "Off"} />
            <Detail.Metadata.Label title="Changes" text={doc.saved ? "Saved" : "Unsaved Changes"} />
            <Detail.Metadata.Label title="Read Only" text={doc.readOnly ? "Yes" : "No"} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {doc && (
            <>
              <Action title="Copy Document Text" icon={Icon.Clipboard} onAction={() => copyText(false)} />
              <Action title="Copy Selected Text" icon={Icon.Text} onAction={() => copyText(true)} />
              {doc.path ? (
                <Action.ShowInFinder
                  path={`${doc.path}/${doc.name}`}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "f" },
                    Windows: { modifiers: ["ctrl", "shift"], key: "f" },
                  }}
                />
              ) : null}
              <Action
                title={doc.tracking ? "Turn off Track Changes" : "Turn on Track Changes"}
                icon={Icon.Pencil}
                onAction={toggle}
              />
            </>
          )}
          <Action
            title="Refresh Document"
            icon={Icon.ArrowClockwise}
            onAction={refresh}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
        </ActionPanel>
      }
    />
  );
}
