import { writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Grid,
  Icon,
  Keyboard,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FRAME_TEXT_MAX_LENGTH } from "qrdx";
import { useState } from "react";
import {
  capFrameText,
  FRAME_CHOICES,
  type FrameChoice,
  frameDefaultColors,
  frameKeywords,
  frameName,
} from "./frames";
import {
  bodyPatternPreviews,
  cornerDotPatternPreviews,
  cornerEyePatternPreviews,
  framePreviews,
} from "./pattern-previews";
import { playgroundLink } from "./playground-link";
import { previewMarkdown } from "./preview-files";
import {
  buildPNGBuffer,
  buildQRProps,
  buildSVGString,
  type QRRenderProps,
} from "./qr-engine";
import { QRMetadata } from "./qr-metadata";
import { generateSavedPreview, saveQR } from "./storage";
import {
  BODY_PATTERNS,
  CORNER_DOT_PATTERNS,
  CORNER_EYE_PATTERNS,
  DEFAULT_SETTINGS,
  ERROR_LEVELS,
  type Settings,
  templateName,
  toLabel,
} from "./types";

/** A code's frame, or the template of a code saved before frames, as text. */
function frameSummary(settings: Settings): { title: string; text: string } {
  if (!settings.frame && settings.templateId) {
    return { title: "Template", text: templateName(settings.templateId) };
  }
  return { title: "Frame", text: frameName(settings.frame) };
}

// ─── Pattern Grid Picker ──────────────────────────────────────────────────────

export function PatternGrid<T extends string>({
  title,
  patterns,
  previews,
  current,
  onSelect,
  label = toLabel,
  keywords,
}: {
  title: string;
  patterns: T[];
  previews: Record<string, string>;
  current: T;
  onSelect: (val: T) => void;
  /** An option's name (default: its id in title case) */
  label?: (val: T) => string;
  /** Words a search finds an option by besides its name */
  keywords?: (val: T) => string[];
}) {
  const { pop } = useNavigation();
  return (
    <Grid
      aspectRatio="1"
      columns={3}
      fit={Grid.Fit.Fill}
      navigationTitle={`Select ${title}`}
      searchBarPlaceholder={`Search ${title.toLowerCase()}…`}
    >
      {patterns.map((p) => (
        <Grid.Item
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Checkmark}
                onAction={() => {
                  onSelect(p);
                  pop();
                }}
                title={`Use ${label(p)}`}
              />
            </ActionPanel>
          }
          content={{ source: previews[p] }}
          key={p}
          keywords={keywords?.(p)}
          subtitle={p === current ? "✓ selected" : undefined}
          title={label(p)}
        />
      ))}
    </Grid>
  );
}

// ─── Save QR Form ─────────────────────────────────────────────────────────────

function SaveQRForm({
  url,
  settings,
  qrProps,
  existingId,
  existingName,
}: {
  url: string;
  settings: Settings;
  qrProps: QRRenderProps;
  existingId?: string;
  existingName?: string;
}) {
  const { pop } = useNavigation();
  const frame = frameSummary(settings);

  async function handleSubmit({ name }: { name: string }) {
    if (!name.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Name is required" });
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving…",
    });
    try {
      const id = existingId ?? `qr-${Date.now()}`;
      // Saved QR Codes draws a preview that fails here when it next loads.
      await generateSavedPreview(id, qrProps).catch(() => undefined);
      await saveQR({
        id,
        name: name.trim(),
        url,
        settings,
        savedAt: Date.now(),
      });
      toast.style = Toast.Style.Success;
      toast.title = `"${name.trim()}" saved`;
      pop();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to save";
      toast.message = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Checkmark}
            onSubmit={handleSubmit}
            title={existingId ? "Update" : "Save"}
          />
        </ActionPanel>
      }
      navigationTitle={existingId ? "Update Saved QR" : "Save QR Code"}
    >
      <Form.TextField
        autoFocus
        defaultValue={existingName ?? ""}
        id="name"
        info="A memorable label for this QR configuration."
        placeholder="My QR Code"
        title="Name"
      />
      <Form.Description text={url} title="Data" />
      <Form.Description text={toLabel(settings.bodyPattern)} title="Body" />
      <Form.Description text={frame.text} title={frame.title} />
    </Form>
  );
}

// ─── QR Preview Detail ────────────────────────────────────────────────────────

export function QRPreview({
  qrProps,
  url,
  settings,
  savedId,
  savedName,
  onEdit,
}: {
  qrProps: QRRenderProps;
  url: string;
  settings: Settings;
  savedId?: string;
  savedName?: string;
  onEdit?: () => void;
}) {
  const svgString = buildSVGString(qrProps);
  const downloadsDir = join(homedir(), "Downloads");

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

  return (
    <Detail
      actions={
        <ActionPanel>
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
          <ActionPanel.Section title="Save">
            <Action.Push
              icon={Icon.Star}
              shortcut={Keyboard.Shortcut.Common.Save}
              target={
                <SaveQRForm
                  existingId={savedId}
                  existingName={savedName}
                  qrProps={qrProps}
                  settings={settings}
                  url={url}
                />
              }
              title={savedId ? "Update Saved QR…" : "Save QR Code…"}
            />
            <Action
              icon={Icon.Download}
              onAction={savePNG}
              shortcut={Keyboard.Shortcut.Common.Duplicate}
              title="Save PNG to Downloads"
            />
            <Action
              icon={Icon.Download}
              onAction={saveSVG}
              shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
              title="Save SVG to Downloads"
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="QRdx">
            <Action.OpenInBrowser
              icon={Icon.Globe}
              shortcut={Keyboard.Shortcut.Common.Open}
              title="Open in QRdx Playground"
              url={playgroundLink(url)}
            />
          </ActionPanel.Section>
          {onEdit && (
            <ActionPanel.Section>
              <Action
                icon={Icon.Pencil}
                onAction={onEdit}
                shortcut={Keyboard.Shortcut.Common.Edit}
                title="Edit"
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
      markdown={previewMarkdown(qrProps)}
      metadata={<QRMetadata Metadata={Detail.Metadata} qrProps={qrProps} />}
      navigationTitle={savedName ?? "QR Code — Preview"}
    />
  );
}

// ─── QR Form ──────────────────────────────────────────────────────────────────

export function QRForm({
  initialUrl = "",
  initialSettings = DEFAULT_SETTINGS,
  onGenerate,
}: {
  initialUrl?: string;
  initialSettings?: Settings;
  onGenerate?: (url: string, settings: Settings) => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [settings, setSettings] = useState<Settings>(initialSettings);

  function set<K extends keyof Settings>(key: K, val: Settings[K]) {
    setSettings((s) => ({ ...s, [key]: val }));
  }

  // A frame replaces the template of a code saved before frames.
  function setFrame(frame: FrameChoice) {
    setSettings(({ templateId, ...s }) => ({
      ...s,
      frame,
      ...(frame || !templateId ? {} : { templateId }),
    }));
  }

  const frameColors = frameDefaultColors(settings.frame);

  function handleGenerate() {
    if (!url.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "URL or text is required",
        message: "Enter a URL, email, phone number, or any plain text.",
      });
      return;
    }
    onGenerate?.(url, settings);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Code}
            onSubmit={handleGenerate}
            title="Generate QR Code"
          />
          <ActionPanel.Section title="Pick Pattern (Visual)">
            <Action.Push
              icon={Icon.AppWindowGrid3x3}
              shortcut={{ modifiers: ["cmd"], key: "1" }}
              target={
                <PatternGrid
                  current={settings.bodyPattern}
                  onSelect={(v) => set("bodyPattern", v)}
                  patterns={BODY_PATTERNS}
                  previews={bodyPatternPreviews}
                  title="Body Pattern"
                />
              }
              title="Pick Body Pattern…"
            />
            <Action.Push
              icon={Icon.AppWindowGrid3x3}
              shortcut={{ modifiers: ["cmd"], key: "2" }}
              target={
                <PatternGrid
                  current={settings.cornerEyePattern}
                  onSelect={(v) => set("cornerEyePattern", v)}
                  patterns={CORNER_EYE_PATTERNS}
                  previews={cornerEyePatternPreviews}
                  title="Corner Eye"
                />
              }
              title="Pick Corner Eye…"
            />
            <Action.Push
              icon={Icon.AppWindowGrid3x3}
              shortcut={{ modifiers: ["cmd"], key: "3" }}
              target={
                <PatternGrid
                  current={settings.cornerEyeDotPattern}
                  onSelect={(v) => set("cornerEyeDotPattern", v)}
                  patterns={CORNER_DOT_PATTERNS}
                  previews={cornerDotPatternPreviews}
                  title="Corner Dot"
                />
              }
              title="Pick Corner Dot…"
            />
            <Action.Push
              icon={Icon.AppWindowGrid3x3}
              shortcut={{ modifiers: ["cmd"], key: "4" }}
              target={
                <PatternGrid
                  current={settings.frame}
                  keywords={frameKeywords}
                  label={frameName}
                  onSelect={setFrame}
                  patterns={FRAME_CHOICES}
                  previews={framePreviews}
                  title="Frame"
                />
              }
              title="Pick Frame…"
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      navigationTitle="qrdx — Generate QR Code"
    >
      <Form.TextField
        autoFocus
        id="url"
        info="URL, email, phone, or any text to encode."
        onChange={setUrl}
        placeholder="https://qrdx.dev"
        title="URL / Text"
        value={url}
      />

      <Form.Separator />

      <Form.Dropdown
        id="bodyPattern"
        info="Press ⌘1 for a full visual picker."
        onChange={(v) => set("bodyPattern", v as Settings["bodyPattern"])}
        title="Body Pattern"
        value={settings.bodyPattern}
      >
        {BODY_PATTERNS.map((p) => (
          <Form.Dropdown.Item
            icon={{ source: bodyPatternPreviews[p] }}
            key={p}
            title={toLabel(p)}
            value={p}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="cornerEyePattern"
        info="Press ⌘2 for a full visual picker."
        onChange={(v) =>
          set("cornerEyePattern", v as Settings["cornerEyePattern"])
        }
        title="Corner Eye"
        value={settings.cornerEyePattern}
      >
        {CORNER_EYE_PATTERNS.map((p) => (
          <Form.Dropdown.Item
            icon={{ source: cornerEyePatternPreviews[p] }}
            key={p}
            title={toLabel(p)}
            value={p}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="cornerEyeDotPattern"
        info="Press ⌘3 for a full visual picker."
        onChange={(v) =>
          set("cornerEyeDotPattern", v as Settings["cornerEyeDotPattern"])
        }
        title="Corner Dot"
        value={settings.cornerEyeDotPattern}
      >
        {CORNER_DOT_PATTERNS.map((p) => (
          <Form.Dropdown.Item
            icon={{ source: cornerDotPatternPreviews[p] }}
            key={p}
            title={toLabel(p)}
            value={p}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="frame"
        info="A call-to-action frame around the code. Press ⌘4 for a full visual picker."
        onChange={(v) => setFrame(v as FrameChoice)}
        title="Frame"
        value={settings.frame}
      >
        {FRAME_CHOICES.map((f) => (
          <Form.Dropdown.Item
            icon={{ source: framePreviews[f] }}
            key={f}
            keywords={frameKeywords(f)}
            title={frameName(f)}
            value={f}
          />
        ))}
      </Form.Dropdown>

      {settings.frame ? (
        <>
          <Form.TextField
            id="frameText"
            info={`Up to ${FRAME_TEXT_MAX_LENGTH} characters. Leave it empty for a frame without a label.`}
            onChange={(v) => set("frameText", capFrameText(v))}
            placeholder="No label"
            title="Frame Label"
            value={settings.frameText}
          />
          <Form.TextField
            id="frameColor"
            info="Hex color of the frame."
            onChange={(v) => set("frameColor", v)}
            placeholder={frameColors?.frame}
            title="Frame Color"
            value={settings.frameColor}
          />
          <Form.TextField
            id="frameTextColor"
            info="Hex color of the frame's label."
            onChange={(v) => set("frameTextColor", v)}
            placeholder={frameColors?.text}
            title="Label Color"
            value={settings.frameTextColor}
          />
        </>
      ) : null}
      {!settings.frame && settings.templateId ? (
        <Form.Description
          text={`${templateName(settings.templateId)}. This code was saved with a template, before frames replaced them. Choose a frame to replace it.`}
          title="Template"
        />
      ) : null}

      <Form.Separator />

      <Form.TextField
        id="fgColor"
        info="Hex color or JSON gradient for the QR modules."
        onChange={(v) => set("fgColor", v)}
        placeholder="#000000"
        title="Foreground"
        value={settings.fgColor}
      />
      <Form.TextField
        id="bgColor"
        info="Hex color or JSON gradient for the background."
        onChange={(v) => set("bgColor", v)}
        placeholder="#ffffff"
        title="Background"
        value={settings.bgColor}
      />
      <Form.TextField
        id="eyeColor"
        info="Override color for corner eye outlines."
        onChange={(v) => set("eyeColor", v)}
        placeholder="Inherits foreground"
        title="Eye Color"
        value={settings.eyeColor}
      />
      <Form.TextField
        id="dotColor"
        info="Override color for corner inner dots."
        onChange={(v) => set("dotColor", v)}
        placeholder="Inherits foreground"
        title="Dot Color"
        value={settings.dotColor}
      />

      <Form.Separator />

      <Form.Dropdown
        id="level"
        info="Higher levels allow more damage but produce denser codes."
        onChange={(v) => set("level", v as Settings["level"])}
        title="Error Correction"
        value={settings.level}
      >
        {ERROR_LEVELS.map((l) => (
          <Form.Dropdown.Item key={l.value} title={l.label} value={l.value} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="logo"
        info="Logo is auto-excavated from the QR center. Use Error Correction Q or H."
        onChange={(v) => set("logo", v)}
        placeholder="https://example.com/logo.png"
        title="Logo URL"
        value={settings.logo}
      />
      <Form.TextField
        id="size"
        info="The code's width in pixels. A frame adds space around it."
        onChange={(v) => set("size", v)}
        placeholder="512"
        title="Size (px)"
        value={settings.size}
      />
      <Form.TextField
        id="margin"
        info="Empty module rows added as quiet zone around the code."
        onChange={(v) => set("margin", v)}
        placeholder="0"
        title="Quiet Zone"
        value={settings.margin}
      />
    </Form>
  );
}

// ─── Editor ───────────────────────────────────────────────────────────────────

/**
 * The form, then a preview of the code it makes. Edit goes back to the form
 * with the same values. With `savedId`, saving updates that saved code.
 */
export function QREditor({
  initialUrl = "",
  initialSettings = DEFAULT_SETTINGS,
  savedId,
  savedName,
}: {
  initialUrl?: string;
  initialSettings?: Settings;
  savedId?: string;
  savedName?: string;
}) {
  const [draft, setDraft] = useState({
    url: initialUrl,
    settings: initialSettings,
  });
  const [previewing, setPreviewing] = useState(false);

  if (previewing) {
    return (
      <QRPreview
        onEdit={() => setPreviewing(false)}
        qrProps={buildQRProps(draft.url, draft.settings)}
        savedId={savedId}
        savedName={savedName}
        settings={draft.settings}
        url={draft.url}
      />
    );
  }

  return (
    <QRForm
      initialSettings={draft.settings}
      initialUrl={draft.url}
      onGenerate={(url, settings) => {
        setDraft({ url, settings });
        setPreviewing(true);
      }}
    />
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function GenerateQR() {
  return <QREditor />;
}
