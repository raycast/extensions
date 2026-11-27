import { Action, ActionPanel, Detail, Form, Grid, Icon, Keyboard, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { FRAME_TEXT_MAX_LENGTH } from "qrdx";
import { useState } from "react";
import { copyPNG, copySVG, savePNG, saveSVG } from "./code-exports";
import { capFrameText, FRAME_CHOICES, type FrameChoice, frameDefaultColors, frameKeywords, frameName } from "./frames";
import { type PreviewKind, usePreviews } from "./pattern-previews";
import { playgroundLink } from "./playground-link";
import { previewMarkdown } from "./preview-files";
import { buildQRProps, type QRRenderProps, withLogoData, withoutRemoteLogo } from "./qr-engine";
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

/**
 * Save PNG and SVG to Downloads. Raycast's common shortcuts (Save, Duplicate…)
 * stand for other actions, so these are the extension's own.
 */
export const SAVE_PNG_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "s" };
export const SAVE_SVG_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "opt"], key: "s" };

/** A code's frame, or the template of a code saved before frames, as text. */
function frameSummary(settings: Settings): { title: string; text: string } {
  if (!settings.frame && settings.templateId) {
    return { title: "Template", text: templateName(settings.templateId) };
  }
  return { title: "Frame", text: frameName(settings.frame) };
}

// ─── Pattern Grid Picker ──────────────────────────────────────────────────────

/** A dropdown item's preview, or none while it's being drawn. */
function previewIcon(path: string | undefined) {
  return path ? { source: path } : undefined;
}

export function PatternGrid<T extends string>({
  title,
  patterns,
  previewKind,
  current,
  onSelect,
  label = toLabel,
  keywords,
}: {
  title: string;
  patterns: T[];
  /** The previews the tiles show; they're drawn when missing */
  previewKind: PreviewKind;
  current: T;
  onSelect: (val: T) => void;
  /** An option's name (default: its id in title case) */
  label?: (val: T) => string;
  /** Words a search finds an option by besides its name */
  keywords?: (val: T) => string[];
}) {
  const { pop } = useNavigation();
  const { previews, isLoading } = usePreviews(previewKind);
  return (
    <Grid
      aspectRatio="1"
      columns={3}
      fit={Grid.Fit.Fill}
      isLoading={isLoading}
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
          content={previews[p] ? { source: previews[p] } : Icon.CircleProgress}
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
          <Action.SubmitForm icon={Icon.Checkmark} onSubmit={handleSubmit} title={existingId ? "Update" : "Save"} />
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
  // A logo given by its address is loaded before the code is drawn; one that
  // can't be loaded is left out of the preview, and the toast says why.
  const { data: drawable, isLoading } = usePromise(withLogoData, [qrProps], {
    failureToastOptions: { title: "Couldn't load the logo" },
  });
  const markdown = drawable ? previewMarkdown(drawable) : isLoading ? "" : previewMarkdown(withoutRemoteLogo(qrProps));

  return (
    <Detail
      actions={
        <ActionPanel>
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
              url={playgroundLink(url)}
            />
          </ActionPanel.Section>
          {onEdit && (
            <ActionPanel.Section>
              <Action icon={Icon.Pencil} onAction={onEdit} shortcut={Keyboard.Shortcut.Common.Edit} title="Edit" />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
      isLoading={isLoading}
      markdown={markdown}
      metadata={<QRMetadata Metadata={Detail.Metadata} qrProps={qrProps} />}
      navigationTitle={savedName ?? "QR Code — Preview"}
    />
  );
}

// ─── QR Form ──────────────────────────────────────────────────────────────────

export function QRForm({
  initialUrl = "",
  initialSettings = DEFAULT_SETTINGS,
  navigationTitle,
  onGenerate,
}: {
  initialUrl?: string;
  initialSettings?: Settings;
  /** Set only where the form is a pushed screen; a command's root has none */
  navigationTitle?: string;
  onGenerate?: (url: string, settings: Settings) => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const body = usePreviews("body");
  const eye = usePreviews("eye");
  const dot = usePreviews("dot");
  const frames = usePreviews("frame");

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
          <Action.SubmitForm icon={Icon.Code} onSubmit={handleGenerate} title="Generate QR Code" />
          <ActionPanel.Section title="Pick Pattern (Visual)">
            <Action.Push
              icon={Icon.AppWindowGrid3x3}
              shortcut={{ modifiers: ["cmd"], key: "1" }}
              target={
                <PatternGrid
                  current={settings.bodyPattern}
                  onSelect={(v) => set("bodyPattern", v)}
                  patterns={BODY_PATTERNS}
                  previewKind="body"
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
                  previewKind="eye"
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
                  previewKind="dot"
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
                  previewKind="frame"
                  title="Frame"
                />
              }
              title="Pick Frame…"
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      isLoading={body.isLoading || eye.isLoading || dot.isLoading || frames.isLoading}
      navigationTitle={navigationTitle}
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
          <Form.Dropdown.Item icon={previewIcon(body.previews[p])} key={p} title={toLabel(p)} value={p} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="cornerEyePattern"
        info="Press ⌘2 for a full visual picker."
        onChange={(v) => set("cornerEyePattern", v as Settings["cornerEyePattern"])}
        title="Corner Eye"
        value={settings.cornerEyePattern}
      >
        {CORNER_EYE_PATTERNS.map((p) => (
          <Form.Dropdown.Item icon={previewIcon(eye.previews[p])} key={p} title={toLabel(p)} value={p} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="cornerEyeDotPattern"
        info="Press ⌘3 for a full visual picker."
        onChange={(v) => set("cornerEyeDotPattern", v as Settings["cornerEyeDotPattern"])}
        title="Corner Dot"
        value={settings.cornerEyeDotPattern}
      >
        {CORNER_DOT_PATTERNS.map((p) => (
          <Form.Dropdown.Item icon={previewIcon(dot.previews[p])} key={p} title={toLabel(p)} value={p} />
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
            icon={previewIcon(frames.previews[f])}
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
 * The form, then a preview of the code it makes, pushed on top of it. Esc or
 * Edit goes back to the form with the same values. With `savedId`, saving
 * updates that saved code.
 */
export function QREditor({
  initialUrl = "",
  initialSettings = DEFAULT_SETTINGS,
  savedId,
  savedName,
  navigationTitle,
}: {
  initialUrl?: string;
  initialSettings?: Settings;
  savedId?: string;
  savedName?: string;
  /** Set only where the editor is a pushed screen */
  navigationTitle?: string;
}) {
  const { push, pop } = useNavigation();
  return (
    <QRForm
      initialSettings={initialSettings}
      initialUrl={initialUrl}
      navigationTitle={navigationTitle}
      onGenerate={(url, settings) =>
        push(
          <QRPreview
            onEdit={pop}
            qrProps={buildQRProps(url, settings)}
            savedId={savedId}
            savedName={savedName}
            settings={settings}
            url={url}
          />
        )
      }
    />
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function GenerateQR() {
  return <QREditor />;
}
