/** biome-ignore-all lint/complexity/noVoid: false positive */

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
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { QRForm, QRPreview } from "./generate-qr";
import { buildPNGBuffer, buildSVGString } from "./qr-engine";
import {
  deleteQR,
  loadSavedQRs,
  type SavedQR,
  savedPreviewPath,
  savedToQRProps,
} from "./storage";
import { toLabel } from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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
      "utf-8",
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
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          target={
            <QRForm
              initialSettings={saved.settings}
              initialUrl={saved.url}
              onGenerate={(url, settings) => {
                // handled inside QRForm → QRPreview flow
                void url;
                void settings;
              }}
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
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          title="Copy SVG to Clipboard"
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Export">
        <Action
          icon={Icon.Download}
          onAction={savePNG}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          title="Save PNG to Downloads"
        />
        <Action
          icon={Icon.Download}
          onAction={saveSVG}
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          title="Save SVG to Downloads"
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

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const items = await loadSavedQRs();
    setList(items);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <List
      isLoading={isLoading}
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
          const previewPath = savedPreviewPath(saved.id);
          const icon = existsSync(previewPath)
            ? { source: previewPath }
            : Icon.Star;

          return (
            <List.Item
              accessories={
                [
                  {
                    text: toLabel(saved.settings.bodyPattern),
                    tooltip: "Body Pattern",
                  },
                  {
                    text: saved.settings.templateId
                      ? toLabel(saved.settings.templateId)
                      : undefined,
                    tooltip: "Template",
                  },
                  {
                    text: formatDate(saved.savedAt),
                    tooltip: "Saved on",
                  },
                ].filter((a) => a.text !== undefined) as List.Item.Accessory[]
              }
              actions={<SavedQRActions onRefresh={refresh} saved={saved} />}
              icon={icon}
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
