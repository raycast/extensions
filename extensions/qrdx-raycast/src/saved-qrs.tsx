import { existsSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { QREditor, QRPreview } from "./generate-qr";
import { playgroundLink } from "./playground-link";
import { imageMarkdown } from "./preview-files";
import { buildPNGBuffer, buildSVGString } from "./qr-engine";
import { QRMetadata } from "./qr-metadata";
import {
  deleteQR,
  drawMissingPreviews,
  loadSavedQRs,
  type SavedQR,
  savedPreviewPath,
  savedToQRProps,
} from "./storage";

// The detail pane shows the markdown in its top half, about 190 pt high in
// Raycast's 475 pt window, and the settings in the bottom half.
const DETAIL_PREVIEW_POINTS = 150;

// ─── Saved QR Item Actions ────────────────────────────────────────────────────

function SavedQRActions({
  saved,
  onRefresh,
}: {
  saved: SavedQR;
  onRefresh: () => void;
}) {
  const downloadsDir = join(homedir(), "Downloads");
  const qrProps = savedToQRProps(saved);
  const svgString = buildSVGString(qrProps);

  async function copyPNG() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Generating PNG…",
    });
    try {
      const buf = buildPNGBuffer(qrProps);
      const tmpPath = join(tmpdir(), `qrdx-${Date.now()}.png`);
      writeFileSync(tmpPath, buf);
      await Clipboard.copy({ file: tmpPath } as Parameters<
        typeof Clipboard.copy
      >[0]);
      toast.style = Toast.Style.Success;
      toast.title = "PNG copied to clipboard";
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to copy PNG";
      toast.message = e instanceof Error ? e.message : String(e);
    }
  }

  async function copySVG() {
    await Clipboard.copy(svgString);
    await showHUD("SVG copied to clipboard");
  }

  async function savePNG() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving PNG…",
    });
    try {
      const buf = buildPNGBuffer(qrProps);
      const outPath = join(downloadsDir, `qrdx-${Date.now()}.png`);
      writeFileSync(outPath, buf);
      toast.style = Toast.Style.Success;
      toast.title = "PNG saved";
      toast.message = outPath;
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to save PNG";
      toast.message = e instanceof Error ? e.message : String(e);
    }
  }

  async function saveSVG() {
    const outPath = join(downloadsDir, `qrdx-${Date.now()}.svg`);
    writeFileSync(
      outPath,
      `<?xml version="1.0" encoding="UTF-8"?>\n${svgString}`,
      "utf-8"
    );
    await showHUD(`SVG saved → ${outPath}`);
  }

  async function handleDelete() {
    const confirmed = await confirmAlert({
      title: `Delete "${saved.name}"?`,
      message:
        "This will remove the saved QR configuration. The action cannot be undone.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await deleteQR(saved.id);
    await showHUD(`"${saved.name}" deleted`);
    onRefresh();
  }

  return (
    <ActionPanel>
      <ActionPanel.Section title="View">
        <Action.Push
          icon={Icon.Eye}
          onPop={onRefresh}
          target={
            <QRPreview
              qrProps={qrProps}
              savedId={saved.id}
              savedName={saved.name}
              settings={saved.settings}
              url={saved.url}
            />
          }
          title="Preview QR Code"
        />
        <Action.Push
          icon={Icon.Pencil}
          onPop={onRefresh}
          shortcut={Keyboard.Shortcut.Common.Edit}
          target={
            <QREditor
              initialSettings={saved.settings}
              initialUrl={saved.url}
              savedId={saved.id}
              savedName={saved.name}
            />
          }
          title="Edit QR Code"
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy">
        <Action
          icon={Icon.Clipboard}
          onAction={copyPNG}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
          title="Copy PNG to Clipboard"
        />
        <Action
          icon={Icon.Clipboard}
          onAction={copySVG}
          shortcut={Keyboard.Shortcut.Common.Copy}
          title="Copy SVG to Clipboard"
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Export">
        <Action
          icon={Icon.Download}
          onAction={savePNG}
          shortcut={Keyboard.Shortcut.Common.Save}
          title="Save PNG to Downloads"
        />
        <Action
          icon={Icon.Download}
          onAction={saveSVG}
          shortcut={Keyboard.Shortcut.Common.Duplicate}
          title="Save SVG to Downloads"
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="QRdx">
        <Action.OpenInBrowser
          icon={Icon.Globe}
          shortcut={Keyboard.Shortcut.Common.Open}
          title="Open in QRdx Playground"
          url={playgroundLink(saved.url)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          icon={Icon.Trash}
          onAction={handleDelete}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          style={Action.Style.Destructive}
          title="Delete"
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function SavedQRs() {
  const [list, setList] = useState<SavedQR[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Counts the previews drawn since loading, so each shows when it's ready.
  const [, setDrawn] = useState(0);

  // Loads the list again after a change, such as an edit or a delete.
  const refresh = useCallback(async () => {
    setIsLoading(true);
    const items = await loadSavedQRs();
    setList(items);
    await drawMissingPreviews(items, () => setDrawn((n) => n + 1));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={list.length > 0}
      navigationTitle="Saved QR Codes"
      searchBarPlaceholder="Search saved QR codes…"
    >
      {list.length === 0 && !isLoading ? (
        <List.EmptyView
          description="Generate a QR code and press ⌘S to save it here."
          icon={Icon.Star}
          title="No Saved QR Codes"
        />
      ) : (
        list.map((saved) => {
          const previewPath = savedPreviewPath(saved);
          const hasPreview = existsSync(previewPath);

          return (
            <List.Item
              actions={<SavedQRActions onRefresh={refresh} saved={saved} />}
              detail={
                <List.Item.Detail
                  // The path changes with the code's settings. A new key makes
                  // Raycast lay the pane out again after an edit; it kept the
                  // old value's width and cut "Liquid" to "Li…id".
                  key={previewPath}
                  markdown={
                    hasPreview
                      ? imageMarkdown(previewPath, DETAIL_PREVIEW_POINTS)
                      : undefined
                  }
                  metadata={
                    <QRMetadata
                      Metadata={List.Item.Detail.Metadata}
                      qrProps={savedToQRProps(saved)}
                      savedAt={saved.savedAt}
                    />
                  }
                />
              }
              icon={hasPreview ? { source: previewPath } : Icon.Star}
              key={saved.id}
              subtitle={saved.url}
              title={saved.name}
            />
          );
        })
      )}
    </List>
  );
}
