import { existsSync } from "node:fs";
import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, List, showHUD } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { copyPNG, copySVG, savePNG, saveSVG } from "./code-exports";
import { QREditor, QRPreview, SAVE_PNG_SHORTCUT, SAVE_SVG_SHORTCUT } from "./generate-qr";
import { playgroundLink } from "./playground-link";
import { imageMarkdown } from "./preview-files";
import { QRMetadata } from "./qr-metadata";
import { deleteQR, drawMissingPreviews, loadSavedQRs, type SavedQR, savedPreviewPath, savedToQRProps } from "./storage";

// The detail pane shows the markdown in its top half, about 190 pt high in
// Raycast's 475 pt window, and the settings in the bottom half.
const DETAIL_PREVIEW_POINTS = 150;

// ─── Saved QR Item Actions ────────────────────────────────────────────────────

function SavedQRActions({ saved, onRefresh }: { saved: SavedQR; onRefresh: () => void }) {
  const qrProps = savedToQRProps(saved);

  async function handleDelete() {
    const confirmed = await confirmAlert({
      title: `Delete "${saved.name}"?`,
      message: "This will remove the saved QR configuration. The action cannot be undone.",
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
              navigationTitle={`Edit ${saved.name}`}
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
          onAction={() => copyPNG(qrProps)}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
          title="Copy PNG to Clipboard"
        />
        <Action
          icon={Icon.Clipboard}
          onAction={() => copySVG(qrProps)}
          shortcut={Keyboard.Shortcut.Common.Copy}
          title="Copy SVG to Clipboard"
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Export">
        <Action
          icon={Icon.Download}
          onAction={() => savePNG(qrProps)}
          shortcut={SAVE_PNG_SHORTCUT}
          title="Save PNG to Downloads"
        />
        <Action
          icon={Icon.Download}
          onAction={() => saveSVG(qrProps)}
          shortcut={SAVE_SVG_SHORTCUT}
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
  // revalidate loads the list again after a change, such as an edit or a
  // delete.
  const {
    data: list = [],
    isLoading,
    error,
    revalidate: refresh,
  } = usePromise(loadSavedQRs, [], {
    failureToastOptions: { title: "Could not load saved QR codes" },
  });

  // The previews of codes saved before this version are drawn after the list
  // shows. Counting them re-renders the list, so each shows when it's ready.
  const [, setDrawn] = useState(0);
  const { isLoading: isDrawing } = usePromise(
    (items: SavedQR[]) => drawMissingPreviews(items, () => setDrawn((n) => n + 1)),
    [list],
    { execute: list.length > 0 }
  );

  return (
    <List
      isLoading={isLoading || isDrawing}
      isShowingDetail={list.length > 0}
      searchBarPlaceholder="Search saved QR codes…"
    >
      {/* A failed reload keeps the codes it had; the hook's toast says why. */}
      {error && list.length === 0 ? (
        <List.EmptyView
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} onAction={refresh} title="Try Again" />
            </ActionPanel>
          }
          description={error.message}
          icon={Icon.Warning}
          title="Could Not Load Saved QR Codes"
        />
      ) : list.length === 0 && !isLoading ? (
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
                  markdown={hasPreview ? imageMarkdown(previewPath, DETAIL_PREVIEW_POINTS) : undefined}
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
