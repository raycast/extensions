import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Color,
  Form,
  Detail,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  trash,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import fs from "node:fs";
import { retryAllFailed } from "./lib/retry-failed";
import path from "node:path";
import { useCallback, useEffect, useRef, useState } from "react";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { formatHmsDisplay, jellyfinStreamUrl, statePaths } from "./lib/env";
import { copyPngToClipboard, recognizeSubtitleBitmapOcr } from "./lib/macos-native";
import { subtitleLanguageLabel } from "./lib/probe";
import { isStudioExportRunning, requestStudioExport } from "./lib/studio-export";
import { createStudioPreview, studioPreviewRevision } from "./lib/studio-preview";
import {
  deleteHistoryEntry,
  clearFailedHistory,
  enqueueTask,
  listActiveTasks,
  readHistory,
  readQueue,
  removeQueuedTask,
  requestTaskStop,
  cancelTaskStop,
  getStopRequestState,
} from "./lib/queue";
import { loadRuntimeConfig } from "./lib/raycast-config";
import {
  ActiveWorkerState,
  CaptureProjectManifest,
  ExtractedLayer,
  HistoryEntry,
  QueueTask,
  RuntimeConfig,
} from "./lib/types";

type StudioManifest = CaptureProjectManifest & { studioDirty?: boolean; studioExportError?: string };

/** Short hint that tells same-language tracks apart (Simplified/Traditional, bilingual, SDH, forced, commentary). */
function trackHint(title: string): string {
  const hints: Array<[RegExp, string]> = [
    [/双语|雙語|bilingual|中英|简英|繁英/i, "Bilingual"],
    [/简|簡|chs|hans|simplified/i, "Simplified"],
    [/繁|cht|hant|traditional/i, "Traditional"],
    [/粤|粵|cantonese/i, "Cantonese"],
    [/sdh|听障|聽障/i, "SDH"],
    [/forced|强制|強制/i, "Forced"],
    [/comment|评论|評論|导评|導評/i, "Commentary"],
  ];
  return hints
    .filter(([pattern]) => pattern.test(title))
    .map(([, label]) => label)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(" · ");
}

function loadManifest(manifestPath?: string): StudioManifest | null {
  if (!manifestPath || !fs.existsSync(manifestPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as StudioManifest;
  } catch {
    return null;
  }
}

const execFileAsync = promisify(execFile);
const projectEdits = new Set<string>();
const pendingPreviews = new Map<string, Promise<string>>();

function previewRevision(source: string): string {
  try {
    const stat = fs.statSync(source);
    return createHash("sha256")
      .update(`${source}:${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}`)
      .digest("hex")
      .slice(0, 20);
  } catch {
    return "";
  }
}

async function createPreview(source: string, projectDir: string, revision: string): Promise<string> {
  const filename = path.join(projectDir, `_studio_preview_${revision}.jpg`);
  const pending = pendingPreviews.get(filename);
  if (pending) return pending;
  if (fs.existsSync(filename)) return filename;
  const operation = (async () => {
    // ImageIO preserves embedded profiles where supported; this 8-bit thumbnail
    // is for layout inspection. HDR originals remain the color reference.
    try {
      await execFileAsync("/usr/bin/sips", ["-s", "format", "jpeg", "-Z", "480", source, "--out", filename], {
        timeout: 30_000,
      });
      const cached = fs
        .readdirSync(projectDir)
        .filter((name) => /^_studio_preview_[a-f0-9]{20}\.jpg$/.test(name))
        .map((name) => ({ name, time: fs.statSync(path.join(projectDir, name)).mtimeMs }))
        .sort((a, b) => b.time - a.time);
      for (const stale of cached.slice(3)) fs.rmSync(path.join(projectDir, stale.name), { force: true });
      return filename;
    } catch (error) {
      fs.rmSync(filename, { force: true });
      throw error;
    }
  })();
  pendingPreviews.set(filename, operation);
  try {
    return await operation;
  } finally {
    pendingPreviews.delete(filename);
  }
}

function PreviewDetail(props: { source?: string; projectDir?: string; markdown: string }) {
  const { source, projectDir, markdown } = props;
  const revision = source ? previewRevision(source) : "";
  const [preview, setPreview] = useState<{ revision: string; filename: string }>();
  const [failed, setFailed] = useState("");
  useEffect(() => {
    let cancelled = false;
    if (source && projectDir && revision) {
      void createPreview(source, projectDir, revision)
        .then((filename) => {
          if (!cancelled) setPreview({ revision, filename });
        })
        .catch(() => {
          if (!cancelled) setFailed(revision);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [source, projectDir, revision]);
  const ready = preview?.revision === revision ? preview.filename : undefined;
  const image = ready ? `![Preview](${pathToFileURL(ready).href})\n\n` : "";
  return (
    <List.Item.Detail
      isLoading={Boolean(source && projectDir && revision && !ready && failed !== revision)}
      markdown={
        image +
        markdown +
        (source
          ? "\n\nPreview is a downscaled 8-bit JPEG. Use the exported original as the HDR color reference."
          : "") +
        (failed === revision && revision ? "\n\nCouldn't generate a preview. Open the original image to view it." : "")
      }
    />
  );
}

function StudioPreviewDetail(props: { manifest: CaptureProjectManifest; config: RuntimeConfig; markdown: string }) {
  const { manifest, config, markdown } = props;
  const revision = studioPreviewRevision(manifest);
  const latest = useRef(manifest);
  latest.current = manifest;
  // usePromise drops stale results; the short delay debounces rapid edits.
  const { data: ready, error } = usePromise(
    async (rev: string) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      void rev;
      return createStudioPreview(structuredClone(latest.current), config);
    },
    [revision],
  );
  return (
    <List.Item.Detail
      isLoading={!ready && !error}
      markdown={
        (ready ? `![Preview](${pathToFileURL(ready).href})\n\n` : "") +
        markdown +
        (error ? "\n\nCouldn't generate a preview. Your edits are kept." : "")
      }
    />
  );
}

function LayerEditorForm(props: {
  manifest: CaptureProjectManifest;
  layer: ExtractedLayer;
  saveChange: (mutator: (m: CaptureProjectManifest) => void, label: string) => Promise<boolean>;
}) {
  const { manifest, layer, saveChange } = props;
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const { pop } = useNavigation();

  async function handleSubmit(values: {
    text: string;
    fontFamily: string;
    fontSize: string;
    yOffset: string;
    fillColor: string;
  }) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      const saved = await saveChange((latest) => {
        const target = latest.layers.find((l) => l.id === layer.id);
        if (!target) throw new Error("This subtitle layer no longer exists. Reopen the studio.");
        // Merge only fields edited in this form into the current on-disk layer.
        if (values.yOffset !== String(layer.yOffset)) {
          const parsedY = Number.parseInt(values.yOffset, 10);
          target.yOffset = Number.isFinite(parsedY) ? parsedY : 0;
        }
        if (target.kind === "text" && layer.kind === "text") {
          if (values.text !== (layer.text ?? "")) target.text = values.text;
          if (values.fontFamily !== (layer.fontFamily || "PingFang SC")) {
            target.fontFamily = values.fontFamily || "PingFang SC";
          }
          const originalSize = layer.fontSize ?? Math.round(manifest.colorInfo.height * 0.044);
          if (values.fontSize !== String(originalSize)) {
            const parsedSize = Number.parseInt(values.fontSize, 10);
            if (Number.isFinite(parsedSize) && parsedSize >= 12) target.fontSize = parsedSize;
          }
          if (values.fillColor && values.fillColor !== (layer.fillColor || "#FFFFFF")) {
            target.fillColor = values.fillColor;
          }
          target.hasActiveContent = (target.text ?? "").trim().length > 0;
        }
      }, "Updating layer preview...");
      if (saved) pop();
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <Form
      isLoading={busy}
      navigationTitle={`Edit Subtitle Layer · [${layer.index}] ${layer.title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Apply and Preview" icon={Icon.CheckCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Track"
        text={`[${layer.index}] ${layer.title} · Type: ${layer.kind === "bitmap" ? "PGS transparent bitmap" : "Editable vector text"}`}
      />
      <Form.TextField
        id="yOffset"
        title="Vertical Offset (px)"
        placeholder="0"
        defaultValue={String(layer.yOffset)}
        info="Negative values move up (e.g. -100 lifts a second language so it doesn't overlap); positive values move down."
      />
      {layer.kind === "text" && (
        <>
          <Form.TextArea id="text" title="Subtitle Text" placeholder="Subtitle text" defaultValue={layer.text ?? ""} />
          <Form.Dropdown id="fontFamily" title="Font" defaultValue={layer.fontFamily || "PingFang SC"}>
            {layer.fontFamily &&
              !["PingFang SC", "Hiragino Sans GB", "Songti SC", "Charter", "Helvetica Neue"].includes(
                layer.fontFamily,
              ) && <Form.Dropdown.Item value={layer.fontFamily} title={layer.fontFamily} />}
            <Form.Dropdown.Item value="PingFang SC" title="PingFang SC" />
            <Form.Dropdown.Item value="Hiragino Sans GB" title="Hiragino Sans GB" />
            <Form.Dropdown.Item value="Songti SC" title="Songti SC" />
            <Form.Dropdown.Item value="Charter" title="Charter (Latin Serif)" />
            <Form.Dropdown.Item value="Helvetica Neue" title="Helvetica Neue" />
          </Form.Dropdown>
          <Form.TextField
            id="fontSize"
            title="Font Size (px)"
            placeholder="48"
            defaultValue={String(layer.fontSize ?? Math.round(manifest.colorInfo.height * 0.044))}
          />
          <Form.Dropdown id="fillColor" title="Subtitle Color" defaultValue={layer.fillColor || "#FFFFFF"}>
            {layer.fillColor && !["#FFFFFF", "#FFD60A", "#7CC8FF"].includes(layer.fillColor) && (
              <Form.Dropdown.Item value={layer.fillColor} title={`Current Color (${layer.fillColor})`} />
            )}
            <Form.Dropdown.Item value="#FFFFFF" title="Cinema White (#FFFFFF)" />
            <Form.Dropdown.Item value="#FFD60A" title="Classic Yellow (#FFD60A)" />
            <Form.Dropdown.Item value="#7CC8FF" title="Secondary Track Light Blue (#7CC8FF)" />
          </Form.Dropdown>
        </>
      )}
    </Form>
  );
}

function LayerStudioView(props: { manifestPath: string; config: RuntimeConfig; onUpdated: () => void }) {
  const { manifestPath, config, onUpdated } = props;
  const [manifest, setManifest] = useState<StudioManifest | null>(() => loadManifest(manifestPath));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!projectEdits.has(manifestPath)) setManifest(loadManifest(manifestPath));
    }, 1500);
    return () => clearInterval(timer);
  }, [manifestPath]);

  // Edits save automatically shortly after each change, while the studio is open.
  const saveRef = useRef({ config, onUpdated });
  saveRef.current = { config, onUpdated };
  const dirtyRevision = manifest?.studioDirty ? JSON.stringify(manifest.layers) : "";
  useEffect(() => {
    if (!dirtyRevision) return;
    const timer = setTimeout(() => {
      void requestStudioExport(manifestPath, saveRef.current.config)
        .then(() => {
          setManifest(loadManifest(manifestPath));
          saveRef.current.onUpdated();
        })
        .catch((error) => showFailureToast(error, { title: "Auto-save failed. Your edits are kept" }));
    }, 600);
    return () => clearTimeout(timer);
  }, [dirtyRevision, manifestPath]);

  const reload = useCallback(() => {
    setManifest(loadManifest(manifestPath));
    onUpdated();
  }, [manifestPath, onUpdated]);

  if (!manifest) {
    return (
      <List navigationTitle="Subtitle Layer Studio" searchBarPlaceholder="Search subtitle tracks">
        <List.EmptyView title="No project manifest found for this capture" icon={Icon.ExclamationMark} />
      </List>
    );
  }

  async function applyChange(
    mutator: (m: CaptureProjectManifest) => void | Promise<void>,
    label: string,
  ): Promise<boolean> {
    if (projectEdits.has(manifestPath)) {
      await showToast({ style: Toast.Style.Animated, title: "Updating this project, please wait" });
      return false;
    }
    projectEdits.add(manifestPath);
    setBusy(true);
    try {
      const toast = await showToast({ style: Toast.Style.Animated, title: label });
      try {
        const latest = loadManifest(manifestPath);
        if (!latest) throw new Error("The project manifest no longer exists. Reopen the studio.");
        const next = structuredClone(latest);
        await mutator(next);
        if (JSON.stringify(loadManifest(manifestPath)) !== JSON.stringify(latest)) {
          throw new Error("The project manifest was changed elsewhere. Try the edit again.");
        }
        next.studioDirty = true;
        fs.writeFileSync(manifestPath, JSON.stringify(next, null, 2), "utf-8");
        reload();
        toast.style = Toast.Style.Success;
        toast.title = "Updated. Saving automatically";
        return true;
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Update failed";
        toast.message = err instanceof Error ? err.message : String(err);
        return false;
      }
    } finally {
      projectEdits.delete(manifestPath);
      setBusy(false);
    }
  }

  async function convertBitmapLayerWithOcr(layer: ExtractedLayer) {
    if (!manifest || !layer.bitmapFilename) return;
    await applyChange(async (m) => {
      const target = m.layers.find((l) => l.id === layer.id);
      if (!target?.bitmapFilename) throw new Error("Subtitle bitmap not found.");
      const text = await recognizeSubtitleBitmapOcr(config.supportPath, path.join(m.projectDir, target.bitmapFilename));
      if (!text) throw new Error("No text recognized (this track may have no subtitle at this moment)");
      {
        target.ocrSourceBitmap = target.bitmapFilename;
        target.kind = "text";
        target.text = text;
        target.fontFamily = "PingFang SC";
        target.fontSize = Math.max(28, Math.round(m.colorInfo.height * 0.044));
        target.fillColor ??= "#FFFFFF";
        target.strokeColor = "#000000";
        target.hasActiveContent = true;
        target.visible = true;
      }
    }, "Recognizing subtitle text and converting to a text layer...");
  }

  const exporting = isStudioExportRunning(config, manifestPath);
  const saveState = exporting
    ? "Saving in background…"
    : manifest.studioExportError
      ? `Save failed: ${manifest.studioExportError}`
      : manifest.studioDirty
        ? "Saving automatically…"
        : "Saved";
  const colorLabel = manifest.colorInfo.isHdr
    ? `16-bit HDR (${manifest.colorInfo.colorTransfer ?? "PQ"})`
    : "16-bit PNG";

  // Same language and hint twice: number them so the rows stay distinguishable.
  const rowKey = (l: ExtractedLayer) => `${subtitleLanguageLabel(l.language)}|${trackHint(l.title)}`;
  function duplicateNumber(layer: ExtractedLayer): string {
    const same = manifest!.layers.filter((l) => rowKey(l) === rowKey(layer));
    return same.length > 1 ? `#${same.indexOf(layer) + 1}` : "";
  }

  // Rendered below the preview in the same scrollable markdown, so the picture comes first.
  function layerMarkdown(layer: ExtractedLayer): string {
    const esc = (s: string) => s.replace(/([\\`*_[\]|<>#])/g, "\\$1");
    const rows: Array<[string, string]> = [
      ["Track", `[${layer.index}] ${esc(layer.title)}`],
      ["Language", `${subtitleLanguageLabel(layer.language)} (${layer.language || "und"})`],
      ["Format", `${layer.codec.toUpperCase()} · ${layer.kind === "bitmap" ? "Image subtitle" : "Editable text"}`],
      [
        "Status",
        `${layer.visible ? "Visible" : "Hidden"} · ${layer.hasActiveContent ? "Subtitle on screen" : "No subtitle at this moment"}`,
      ],
      ...(layer.kind === "text" && layer.text
        ? [["Text", esc(layer.text.replace(/\n/g, " / "))] as [string, string]]
        : []),
      ["Vertical Offset", layer.yOffset === 0 ? "None" : `${layer.yOffset > 0 ? "+" : ""}${layer.yOffset} px`],
      ...(layer.kind === "text"
        ? [
            [
              "Font",
              `${esc(layer.fontFamily || "PingFang SC")} · ${layer.fontSize ?? Math.round(manifest!.colorInfo.height * 0.044)} px · ${layer.fillColor || "#FFFFFF"}`,
            ] as [string, string],
          ]
        : []),
      [
        "Frame",
        `${manifest!.timestampFormatted} · ${manifest!.colorInfo.width}×${manifest!.colorInfo.height} · ${colorLabel}`,
      ],
      ["Save Status", esc(saveState)],
    ];
    return rows.map(([k, v]) => `**${k}**: ${v}`).join("  \n");
  }

  return (
    <List
      isShowingDetail
      isLoading={busy || exporting}
      navigationTitle={`Subtitle Layer Studio · ${manifest.movieName}`}
    >
      <List.Section title={`Subtitle Tracks (${manifest.layers.length})`}>
        {manifest.layers.map((layer) => (
          <List.Item
            key={layer.id}
            title={subtitleLanguageLabel(layer.language)}
            subtitle={[trackHint(layer.title), duplicateNumber(layer)].filter(Boolean).join(" ")}
            icon={
              layer.visible
                ? { source: Icon.Eye, tintColor: Color.Green }
                : { source: Icon.EyeDisabled, tintColor: Color.SecondaryText }
            }
            accessories={
              layer.hasActiveContent ? [] : [{ text: { value: "No subtitle now", color: Color.SecondaryText } }]
            }
            detail={<StudioPreviewDetail manifest={manifest} config={config} markdown={layerMarkdown(layer)} />}
            actions={
              <ActionPanel>
                <Action
                  title={layer.visible ? "Hide Subtitle Track" : "Show Subtitle Track"}
                  icon={layer.visible ? Icon.EyeDisabled : Icon.Eye}
                  onAction={() =>
                    applyChange((m) => {
                      const t = m.layers.find((x) => x.id === layer.id);
                      if (t) t.visible = !t.visible;
                    }, "Updating layer visibility...")
                  }
                />
                <Action.Push
                  title="Edit Position, Text, and Font"
                  icon={Icon.Pencil}
                  target={<LayerEditorForm manifest={manifest} layer={layer} saveChange={applyChange} />}
                />
                <Action
                  title="Raise Above Other Subtitles"
                  icon={Icon.ArrowUpCircle}
                  shortcut={Keyboard.Shortcut.Common.MoveUp}
                  onAction={() =>
                    applyChange((m) => {
                      const t = m.layers.find((x) => x.id === layer.id);
                      if (t) {
                        t.visible = true;
                        t.yOffset -= Math.round(m.colorInfo.height * 0.085);
                      }
                    }, "Moving subtitle layer up...")
                  }
                />
                <Action
                  title="Reset Vertical Offset"
                  icon={Icon.ArrowCounterClockwise}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  onAction={() =>
                    applyChange((m) => {
                      const t = m.layers.find((x) => x.id === layer.id);
                      if (t) t.yOffset = 0;
                    }, "Resetting subtitle position...")
                  }
                />
                {layer.kind === "bitmap" && layer.bitmapFilename && (
                  <Action
                    title="Convert to Editable Text (OCR)"
                    icon={Icon.Text}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                    onAction={() => convertBitmapLayerWithOcr(layer)}
                  />
                )}
                <Action.ShowInFinder path={manifest.projectDir} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

export default function StudioCommand() {
  const [config] = useState<RuntimeConfig>(() => loadRuntimeConfig());
  const [activeTasks, setActiveTasks] = useState<ActiveWorkerState[]>([]);
  const [queue, setQueue] = useState<QueueTask[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const refreshAll = useCallback(() => {
    setActiveTasks(listActiveTasks(config.supportPath));
    setQueue(readQueue(config.supportPath));
    setHistory(readHistory(config.supportPath));
  }, [config.supportPath]);

  useEffect(() => {
    refreshAll();
    const timer = setInterval(refreshAll, 1500);
    return () => clearInterval(timer);
  }, [refreshAll]);

  // Catch up on studio edits whose exit-save never ran (Raycast closed mid-way).
  useEffect(() => {
    for (const entry of readHistory(config.supportPath)) {
      const file = entry.manifestPath;
      if (!file || isStudioExportRunning(config, file)) continue;
      const m = loadManifest(file);
      if (m?.studioDirty && !m.studioExportError) void requestStudioExport(file, config).catch(() => undefined);
    }
  }, [config]);

  const workerAlive = activeTasks.length > 0;

  // Queued work runs inside the capture command, which keeps going after the window closes.
  async function resumeQueue() {
    await launchCommand({ name: "capture-frame", type: LaunchType.UserInitiated, context: { resumeQueue: true } });
  }

  const activeTaskIds = new Set(activeTasks.map((state) => state.task.id));

  return (
    <List isShowingDetail searchBarPlaceholder="Search captured frames, clips, or queued tasks...">
      <List.Section
        title="Background Queue"
        subtitle={
          workerAlive
            ? `Processing ${activeTasks.length}/3 · Queued ${queue.length} · ${new Set([...activeTasks.map((s) => (s.task.type === "screenshot" ? s.task.captureRequestId || s.task.id : s.task.id)), ...queue.map((t) => (t.type === "screenshot" ? t.captureRequestId || t.id : t.id))]).size} requests`
            : queue.length > 0
              ? `Waiting to start · ${queue.length} queued`
              : "Idle"
        }
      >
        {activeTasks.map((activeTask) => {
          const stopState = getStopRequestState(config.supportPath, activeTask.task.id);
          let readProgress = "";
          if (activeTask) {
            try {
              const progress = JSON.parse(
                fs.readFileSync(
                  path.join(statePaths(config.supportPath).projectsDir, activeTask.task.id, "read-progress.json"),
                  "utf8",
                ),
              );
              readProgress = `Read ${(progress.bytes / 1048576).toFixed(1)} MiB · ${progress.requests} requests`;
            } catch {
              /* No network reads yet. */
            }
          }

          return (
            <List.Item
              key={activeTask.task.id}
              title={activeTask.task.probe.movieName}
              subtitle={
                stopState === "requested" ? "Stop requested" : stopState === "stopping" ? "Stopping" : "Processing"
              }
              icon={{ source: Icon.Clock, tintColor: Color.Orange }}
              accessories={[
                {
                  tag: {
                    value: `${Math.max(0, Math.round((Date.now() - activeTask.startedAt) / 1000))}s`,
                    color: Color.Orange,
                  },
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={`### Running Background Task\n\n- **Title**: ${activeTask.task.probe.movieName}\n- **Source**: ${activeTask.task.probe.playerLabel}\n- **Stage**: ${activeTask.stage}\n- **Read Progress**: ${readProgress || "Waiting for data"}`}
                />
              }
              actions={
                <ActionPanel>
                  {stopState === "requested" && (
                    <Action
                      title="Cancel Stop Request"
                      icon={Icon.Play}
                      onAction={async () => {
                        try {
                          cancelTaskStop(config.supportPath, activeTask.task.id);
                          refreshAll();
                          await showToast({ style: Toast.Style.Success, title: "Stop request canceled" });
                        } catch (error) {
                          await showFailureToast(error, { title: "Couldn't cancel stop request" });
                        }
                      }}
                    />
                  )}
                  {stopState === "none" && (
                    <Action
                      title="Stop Current Task"
                      icon={Icon.Stop}
                      onAction={async () => {
                        try {
                          requestTaskStop(config.supportPath, activeTask.task.id);
                          await showToast({
                            style: Toast.Style.Success,
                            title: "Stop requested",
                            message:
                              "You can cancel it from the Action Panel until the worker confirms. Progress shows in the task status.",
                          });
                          refreshAll();
                        } catch (error) {
                          await showFailureToast(error, { title: "Couldn't request stop" });
                        }
                      }}
                    />
                  )}
                  <Action.Push
                    title="Show Details"
                    target={
                      <Detail
                        markdown={`**${activeTask.task.probe.movieName}**\n\n${activeTask.stage}\n\n${readProgress}`}
                      />
                    }
                  />
                  <Action title="Refresh Status" icon={Icon.RotateClockwise} onAction={refreshAll} />
                  <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                </ActionPanel>
              }
            />
          );
        })}

        {queue.map((t, idx) => (
          <List.Item
            key={t.id}
            title={`${idx + 1}. [${t.type === "screenshot" ? "Frame Capture" : t.type === "clip" ? "A/B Clip" : "Subtitles"}] ${t.probe.movieName}`}
            subtitle={
              t.type === "screenshot"
                ? `${formatHmsDisplay(t.probe.positionSec)}${t.captureRequestId ? ` · Request ${t.captureRequestId.slice(0, 6)}` : ""}`
                : t.type === "clip"
                  ? `${t.durationSec.toFixed(1)}s`
                  : "Composing subtitles"
            }
            icon={Icon.Hourglass}
            actions={
              <ActionPanel>
                <Action
                  title="Resume Queue"
                  icon={Icon.Play}
                  onAction={async () => {
                    await resumeQueue();
                    refreshAll();
                  }}
                />
                <Action
                  title="Cancel Queued Task"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => {
                    removeQueuedTask(config.supportPath, t.id);
                    refreshAll();
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {(["failed", "completed"] as const).map((group) => (
        <List.Section
          key={group}
          title={
            group === "failed"
              ? `Failed Tasks (${history.filter((item) => item.status === "failed" && !activeTaskIds.has(item.id)).length})`
              : `Recent Captures (${history.filter((item) => item.status !== "failed").length})`
          }
        >
          {group === "completed" && history.length === 0 && !workerAlive && queue.length === 0 && (
            <List.Item
              title="No frame captures or clips yet"
              subtitle="Run Capture Frame while watching to capture a frame"
              icon={Icon.Video}
              detail={
                <List.Item.Detail
                  markdown={[
                    "### Get Started with FrameCraft",
                    "",
                    "1. **IINA local playback**: Follow the README to enable the IINA connection, then run Capture Frame.",
                    "2. **Jellyfin/Emby sessions**: Press `Cmd + Shift + ,` to open extension preferences, then enter your Jellyfin/Emby server URL and API key.",
                    "3. **Subtitle adjustments**: When a capture finishes, select it in the gallery and press Return. You can toggle subtitle tracks and adjust their vertical position. Frames keep their original size, with no added bars.",
                  ].join("\n")}
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Configure Jellyfin/emby and Output Folder"
                    icon={Icon.Gear}
                    onAction={openExtensionPreferences}
                  />
                  <Action.Open title="Open Output Folder" target={config.saveDirectory} />
                </ActionPanel>
              }
            />
          )}

          {history
            .filter((item) =>
              group === "failed" ? item.status === "failed" && !activeTaskIds.has(item.id) : item.status !== "failed",
            )
            .map((item) => {
              const previewFile = item.subbedPngPath || item.cleanPngPath;
              const externalState = item.exportState?.modified
                ? "Local files modified"
                : item.exportState?.missing.length
                  ? "Some local files deleted"
                  : "";
              const detailMd =
                item.status === "failed"
                  ? `### Task Failed: ${item.movieName}\n\n` +
                    `- **Task Type**: ${item.taskKind === "clip" ? "Video clip" : item.taskKind === "compose" ? "Subtitle compose" : "Frame capture"}\n` +
                    `- **Position**: ${item.failureLabel || item.timestampLabel}\n` +
                    `- **Source**: ${item.source}\n` +
                    `- **Created**: ${new Date(item.createdAt).toLocaleString()}\n\n` +
                    `**Reason**\n\n${item.errorMessage || "Unknown error"}\n\nAfter fixing the problem, retry it from the Action Panel.`
                  : item.type === "screenshot" && previewFile && fs.existsSync(previewFile)
                    ? `**${item.movieName}** · \`${item.timestampLabel}\`\n\n` +
                      `- **Color**: ${item.isHdr ? "16-bit HDR, original color preserved" : "16-bit lossless original"}\n` +
                      `- **Subtitle Tracks**: ${item.trackCount ?? 0} (all kept in SVG)\n` +
                      `- **Source**: ${item.source}`
                    : `### 🎬 Video Clip: ${item.movieName}\n\n` +
                      `- **Range**: \`${item.timestampLabel}\`\n` +
                      `- **Size**: ${item.sizeMb ?? 0} MB\n` +
                      `- **File**: \`${item.clipMkvPath ?? ""}\``;

              return (
                <List.Item
                  key={item.id}
                  title={item.movieName}
                  subtitle={`${item.status === "failed" ? item.failureLabel || item.timestampLabel : item.timestampLabel}${externalState ? " · Changed locally" : ""}${item.composeState === "pending" ? " · Composing subtitles" : item.composeState === "failed" ? " · Subtitle compose failed" : ""}`}
                  icon={
                    item.status === "failed"
                      ? Icon.ExclamationMark
                      : item.type === "screenshot"
                        ? Icon.Image
                        : Icon.FilmStrip
                  }
                  accessories={[
                    ...(item.status === "failed"
                      ? [
                          {
                            tag: {
                              value:
                                item.taskKind === "clip"
                                  ? "Clip Failed"
                                  : item.taskKind === "compose"
                                    ? "Subtitle Failed"
                                    : "Capture Failed",
                              color: Color.Red,
                            },
                          },
                        ]
                      : []),

                    {
                      tag:
                        item.type === "screenshot"
                          ? `${item.trackCount ?? 0} ${item.trackCount === 1 ? "track" : "tracks"}`
                          : `${item.sizeMb ?? 0} MB`,
                    },
                  ]}
                  detail={
                    <PreviewDetail
                      source={item.status !== "failed" && item.type === "screenshot" ? previewFile : undefined}
                      projectDir={item.manifestPath ? path.dirname(item.manifestPath) : undefined}
                      markdown={detailMd}
                    />
                  }
                  actions={
                    <ActionPanel>
                      {item.status === "failed" && (
                        <Action
                          title="Retry All Failed Tasks"
                          icon={Icon.Play}
                          onAction={async () => {
                            try {
                              const result = await retryAllFailed(config);
                              if (result.submitted) await resumeQueue();
                              refreshAll();
                              await showToast({
                                style: Toast.Style.Success,
                                title: `Submitted ${result.submitted} tasks`,
                                message: result.skipped
                                  ? `${result.skipped} skipped (merged, still running, or missing retry data)`
                                  : undefined,
                              });
                            } catch (error) {
                              await showFailureToast(error, { title: "Couldn't retry failed tasks" });
                            }
                          }}
                        />
                      )}
                      {item.status === "failed" && (
                        <Action
                          title="Retry Failed Task"
                          icon={Icon.Play}
                          onAction={async () => {
                            try {
                              const retryFile = path.join(
                                statePaths(config.supportPath).projectsDir,
                                item.id,
                                "retry.json",
                              );
                              const task = JSON.parse(fs.readFileSync(retryFile, "utf-8")) as QueueTask;
                              task.config = config;
                              if (task.probe.source === "jellyfin-remote" && task.probe.itemId) {
                                task.probe.mediaTarget = jellyfinStreamUrl(
                                  config.jellyfinUrl,
                                  config.jellyfinApiKey,
                                  task.probe.itemId,
                                  task.probe.mediaSourceId,
                                );
                                task.probe.isRemote = true;
                              }
                              if (
                                listActiveTasks(config.supportPath).some((t) => t.task.id === task.id) ||
                                readQueue(config.supportPath).some((t) => t.id === task.id)
                              ) {
                                throw new Error("This task is still running or queued. Wait for it to finish.");
                              }
                              enqueueTask(config.supportPath, task);
                              deleteHistoryEntry(config.supportPath, item.id);
                              await resumeQueue();
                              refreshAll();
                              await showToast({ style: Toast.Style.Success, title: "Task resubmitted" });
                            } catch (error) {
                              refreshAll();
                              await showFailureToast(error, { title: "Retry failed" });
                            }
                          }}
                        />
                      )}
                      {item.status !== "failed" &&
                        item.type === "screenshot" &&
                        item.manifestPath &&
                        Boolean(loadManifest(item.manifestPath)?.layers.length) && (
                          <Action.Push
                            title="Open Subtitle Layer Studio"
                            icon={Icon.Layers}
                            target={
                              <LayerStudioView
                                manifestPath={item.manifestPath}
                                config={config}
                                onUpdated={refreshAll}
                              />
                            }
                          />
                        )}
                      {item.subbedPngPath && fs.existsSync(item.subbedPngPath) && (
                        <Action
                          title="Copy 16-Bit Image with Subtitles"
                          icon={Icon.CopyClipboard}
                          onAction={async () => {
                            await copyPngToClipboard(config.supportPath, item.subbedPngPath!);
                            await showToast({ style: Toast.Style.Success, title: "Copied image to clipboard" });
                          }}
                        />
                      )}
                      {item.layeredSvgPath && fs.existsSync(item.layeredSvgPath) && (
                        <Action.Open title="Open Layered SVG" target={item.layeredSvgPath} />
                      )}
                      {item.cleanPngPath && fs.existsSync(item.cleanPngPath) && (
                        <Action.Open title="Open Clean Image" target={item.cleanPngPath} />
                      )}
                      {item.clipMkvPath && fs.existsSync(item.clipMkvPath) && (
                        <Action.Open title="Play Video Clip" target={item.clipMkvPath} />
                      )}
                      {(item.subbedPngPath || item.clipMkvPath) && (
                        <Action.ShowInFinder path={(item.subbedPngPath || item.clipMkvPath)!} />
                      )}
                      {item.status !== "failed" && (
                        <Action
                          title="Delete Files and Gallery Entry"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          onAction={async () => {
                            if (
                              await confirmAlert({
                                title: "Move these exported files to the Trash?",
                                message:
                                  "The PNG, SVG, or video files of this capture go to the Trash and can be restored from there.",
                                primaryAction: { title: "Move to Trash", style: Alert.ActionStyle.Destructive },
                              })
                            ) {
                              try {
                                const files = [
                                  ...new Set([
                                    item.cleanPngPath,
                                    item.subbedPngPath,
                                    item.layeredSvgPath,
                                    item.clipMkvPath,
                                  ]),
                                ].filter(
                                  (file): file is string =>
                                    !!file && fs.existsSync(file) && fs.lstatSync(file).isFile(),
                                );
                                if (files.length) await trash(files);
                                deleteHistoryEntry(config.supportPath, item.id);
                                refreshAll();
                              } catch (error) {
                                await showFailureToast(error, { title: "Couldn't move files to the Trash" });
                              }
                            }
                          }}
                        />
                      )}
                      <Action
                        title="Remove from List"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                        onAction={async () => {
                          if (
                            await confirmAlert({
                              title: "Remove this entry from the list?",
                              message:
                                item.status === "failed"
                                  ? "The failed task can no longer be retried."
                                  : "Exported files stay on disk; only the gallery entry is removed.",
                              primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
                            })
                          ) {
                            deleteHistoryEntry(config.supportPath, item.id);
                            refreshAll();
                          }
                        }}
                      />
                      {item.status === "failed" && (
                        <Action
                          title="Clear All Failed Tasks"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          onAction={async () => {
                            if (
                              await confirmAlert({
                                title: "Clear all failed tasks?",
                                message: "Only failed entries are removed. Saved images and videos are kept.",
                                primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
                              })
                            ) {
                              clearFailedHistory(config.supportPath);
                              refreshAll();
                            }
                          }}
                        />
                      )}
                      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                      <Action.Push title="Show Details" target={<Detail markdown={detailMd} />} />
                    </ActionPanel>
                  }
                />
              );
            })}
        </List.Section>
      ))}
    </List>
  );
}
