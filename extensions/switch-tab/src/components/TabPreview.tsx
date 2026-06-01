import { Detail, ActionPanel, Action, Icon, Color, showToast, Toast, Clipboard, environment } from "@raycast/api";
import { DisplayTab } from "../types";
import { useEffect, useState, useRef } from "react";
import { subscribeToSnapshots } from "../context/BrowserStore";
import path from "path";
import fs from "fs";
import os from "os";

import { BridgeMessage } from "../types";

interface TabPreviewProps {
  tab: DisplayTab;
  sendToSocket: (msg: BridgeMessage) => void;
  activate: (tab: DisplayTab) => void;
  close: (tab: DisplayTab) => void;
}

export function TabPreview({ tab, sendToSocket, activate, close }: TabPreviewProps) {
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [snapshotPath, setSnapshotPath] = useState<string | null>(null);
  const [isCached, setIsCached] = useState<boolean | null>(null); // null = unknown, true = cached, false = live
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const lastFilePath = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToSnapshots((msg) => {
      if (!tab?.extId) return;

      if (msg.tabId === tab.extId) {
        if (msg.snapshot && typeof msg.snapshot === "string") {
          try {
            const baseDir = environment.supportPath || os.tmpdir();
            if (!fs.existsSync(baseDir)) {
              fs.mkdirSync(baseDir, { recursive: true });
            }

            const safeId = String(tab.extId).replace(/[^a-z0-9]/gi, "_");

            // V1402: PROACTIVE FILE GC
            // Clean up old snapshots for this tab specifically
            try {
              const oldFiles = fs
                .readdirSync(baseDir)
                .filter((f: string) => f.startsWith(`snap_${safeId}_`) && f.endsWith(".jpg"));
              for (const f of oldFiles) {
                const p = path.join(baseDir, f);
                if (fs.existsSync(p)) fs.unlinkSync(p);
              }
            } catch {
              /* best effort cleanup */
            }

            // Unique filename busts Raycast's image cache
            const filePath = path.join(baseDir, `snap_${safeId}_${Date.now()}.jpg`);
            const base64Data = msg.snapshot.split(",")[1] || msg.snapshot;
            if (!base64Data) return;

            fs.writeFileSync(filePath, base64Data, { encoding: "base64" });

            const normalizedPath = filePath.replace(/\\/g, "/");
            setSnapshotPath(`file:///${normalizedPath}`);
            lastFilePath.current = filePath; // Track for unmount cleanup
            setSnapshot(msg.snapshot);
            setIsCached(msg.cached ?? null);
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("[TabPreview] Save failed:", err);
            showToast(Toast.Style.Failure, "Preview Error", message || "FileSystem error");
          }
        } else {
          // No snapshot available
          setSnapshot(null);
          setSnapshotPath(null);
          setIsCached(msg.cached ?? null);
        }
        setIsLoading(false);
      }
    });

    sendToSocket({ type: "GET_TAB_SNAPSHOT", tabId: tab.extId });

    return () => {
      unsubscribe();
      // V1402: FINAL CLEANUP ON UNMOUNT
      if (lastFilePath.current) {
        try {
          if (fs.existsSync(lastFilePath.current)) {
            fs.unlinkSync(lastFilePath.current);
            lastFilePath.current = null;
          }
        } catch {
          /* ignore cleanup errors */
        }
      }
    };
  }, [tab.extId]);

  // Determine status label
  const getStatusLabel = (): { text: string; color: string } => {
    if (isLoading) return { text: "Loading", color: Color.SecondaryText };
    if (!snapshot && !snapshotPath) return { text: "Unavailable", color: Color.Orange };
    if (isCached === false) return { text: "Active", color: Color.Blue };
    if (isCached === true) return { text: "Cached", color: Color.SecondaryText };
    return { text: "Preview", color: Color.Green };
  };

  const status = getStatusLabel();

  const markdown = snapshotPath
    ? `![Snapshot](${snapshotPath})`
    : isLoading
      ? "### 📸 Capturing snapshot..."
      : "### 📄 No preview available for this tab.\n\nVisit the tab in your browser once to capture a visual preview.";

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${tab.displayTitle} [${status.text}]`}
      metadata={
        isFullscreen ? undefined : (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Title" text={tab.title} />
            <Detail.Metadata.Label title="Domain" text={tab.subtitle} />
            <Detail.Metadata.Label title="URL" text={tab.url} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item text={status.text} color={status.color} />
              {tab.pinned && <Detail.Metadata.TagList.Item text="Pinned" color={Color.Blue} />}
              {tab.audible && <Detail.Metadata.TagList.Item text="Audible" color={Color.Green} />}
              {tab.discarded && <Detail.Metadata.TagList.Item text="Discarded" color={Color.SecondaryText} />}
              {tab.frozen && !tab.discarded && <Detail.Metadata.TagList.Item text="Sleeping" color={Color.Orange} />}
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label
              title="Browser"
              text={tab.browserType ? tab.browserType.toUpperCase() : "Unknown"}
              icon={tab.browserType === "edge" ? Icon.Globe : Icon.Circle}
            />
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={isFullscreen ? "Show Metadata" : "Full Preview"}
              icon={isFullscreen ? Icon.Sidebar : Icon.Maximize}
              onAction={() => setIsFullscreen(!isFullscreen)}
            />
            <Action
              title="Switch to Tab"
              icon={Icon.ArrowRight}
              onAction={() => activate(tab)}
              shortcut={{ modifiers: ["ctrl"], key: "return" }}
            />
            {snapshotPath && (
              <Action
                title="Copy Preview Image"
                icon={Icon.CopyClipboard}
                onAction={async () => {
                  try {
                    // Extract actual file path from the file:/// URI
                    const filePath = snapshotPath!.replace("file:///", "").replace(/\//g, path.sep);
                    await Clipboard.copy({ file: filePath });
                    showToast(Toast.Style.Success, "Image copied to clipboard");
                  } catch {
                    showToast(Toast.Style.Failure, "Failed to copy image");
                  }
                }}
                shortcut={{ modifiers: ["ctrl"], key: "c" }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Close Tab"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => close(tab)}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
