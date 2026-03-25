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
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import type { QRProps } from "qrdx";
import { useState } from "react";
import {
  bodyPatternPreviews,
  cornerDotPatternPreviews,
  cornerEyePatternPreviews,
  templatePreviews,
} from "./pattern-previews";
import { buildPNGBuffer, buildSVGString, getSVGDataURI } from "./qr-engine";
import { generateSavedPreview, saveQR } from "./storage";
import {
  BODY_PATTERNS,
  CORNER_DOT_PATTERNS,
  CORNER_EYE_PATTERNS,
  DEFAULT_SETTINGS,
  ERROR_LEVELS,
  type Settings,
  TEMPLATES,
  toLabel,
} from "./types";

// ─── Build QRProps ────────────────────────────────────────────────────────────

export function buildQRProps(
  url: string,
  s: Settings,
): QRProps & { size: number } {
  const size = Math.max(64, Number.parseInt(s.size || "512", 10) || 512);
  const margin = Number.parseInt(s.margin || "0", 10) || 0;
  const props: QRProps & { size: number } = {
    value: url.trim() || "https://qrdx.dev",
    size,
    margin,
    level: s.level || "Q",
    bodyPattern: s.bodyPattern,
    cornerEyePattern: s.cornerEyePattern,
    cornerEyeDotPattern: s.cornerEyeDotPattern,
    fgColor: s.fgColor?.trim() || "#000000",
    bgColor: s.bgColor?.trim() || "#ffffff",
  };
  if (s.eyeColor?.trim()) props.eyeColor = s.eyeColor.trim();
  if (s.dotColor?.trim()) props.dotColor = s.dotColor.trim();
  if (s.templateId?.trim()) props.templateId = s.templateId.trim();
  if (s.logo?.trim()) {
    props.imageSettings = {
      src: s.logo.trim(),
      height: Math.round(size * 0.2),
      width: Math.round(size * 0.2),
      excavate: true,
    };
  }
  return props;
}

// ─── Pattern Grid Picker ──────────────────────────────────────────────────────

export function PatternGrid<T extends string>({
  title,
  patterns,
  previews,
  current,
  onSelect,
}: {
  title: string;
  patterns: T[];
  previews: Record<string, string>;
  current: T;
  onSelect: (val: T) => void;
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
                title={`Use ${toLabel(p)}`}
              />
            </ActionPanel>
          }
          content={{ source: previews[p] }}
          key={p}
          subtitle={p === current ? "✓ selected" : undefined}
          title={toLabel(p)}
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
  qrProps: QRProps & { size: number };
  existingId?: string;
  existingName?: string;
}) {
  const { pop } = useNavigation();

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
      const svgString = buildSVGString(qrProps);
      generateSavedPreview(id, svgString);
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
      <Form.Description
        text={settings.templateId ? toLabel(settings.templateId) : "None"}
        title="Template"
      />
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
  qrProps: QRProps & { size: number };
  url: string;
  settings: Settings;
  savedId?: string;
  savedName?: string;
  onEdit?: () => void;
}) {
  const dataURI = getSVGDataURI(qrProps);
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
      "utf-8",
    );
    await showHUD(`SVG saved → ${outPath}`);
  }

  const colorStr = (c: QRProps["fgColor"]) =>
    typeof c === "string" ? c : JSON.stringify(c);

  const meta = [
    "| | |",
    "|---|---|",
    `| **Data** | \`${qrProps.value}\` |`,
    `| **Body** | ${toLabel(qrProps.bodyPattern ?? "square")} |`,
    `| **Corner Eye** | ${toLabel(qrProps.cornerEyePattern ?? "square")} |`,
    `| **Corner Dot** | ${toLabel(qrProps.cornerEyeDotPattern ?? "square")} |`,
    `| **Foreground** | \`${colorStr(qrProps.fgColor)}\` |`,
    `| **Background** | \`${colorStr(qrProps.bgColor)}\` |`,
    ...(qrProps.eyeColor
      ? [`| **Eye Color** | \`${colorStr(qrProps.eyeColor)}\` |`]
      : []),
    ...(qrProps.dotColor
      ? [`| **Dot Color** | \`${colorStr(qrProps.dotColor)}\` |`]
      : []),
    ...(qrProps.templateId ? [`| **Template** | ${qrProps.templateId} |`] : []),
    ...(qrProps.imageSettings?.src
      ? [`| **Logo** | ${qrProps.imageSettings.src} |`]
      : []),
    `| **Error Correction** | ${qrProps.level ?? "Q"} |`,
    `| **Size** | ${qrProps.size}px |`,
    ...(qrProps.margin ? [`| **Margin** | ${qrProps.margin} |`] : []),
  ].join("\n");

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
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              title="Copy SVG to Clipboard"
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Save">
            <Action.Push
              icon={Icon.Star}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
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
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              title="Save PNG to Downloads"
            />
            <Action
              icon={Icon.Download}
              onAction={saveSVG}
              shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
              title="Save SVG to Downloads"
            />
          </ActionPanel.Section>
          {onEdit && (
            <ActionPanel.Section>
              <Action
                icon={Icon.Pencil}
                onAction={onEdit}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                title="Edit"
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
      markdown={`![QR Code](${dataURI})\n\n${meta}`}
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
                  current={settings.templateId}
                  onSelect={(v) => set("templateId", v)}
                  patterns={TEMPLATES.map((t) => t.value)}
                  previews={templatePreviews}
                  title="Template"
                />
              }
              title="Pick Template…"
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
        id="templateId"
        info="Press ⌘4 for a full visual picker."
        onChange={(v) => set("templateId", v)}
        title="Template"
        value={settings.templateId}
      >
        {TEMPLATES.map((t) => (
          <Form.Dropdown.Item
            icon={{ source: templatePreviews[t.value] }}
            key={t.value}
            title={t.label}
            value={t.value}
          />
        ))}
      </Form.Dropdown>

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
        info="Logo is auto-excavated from the QR centre. Use Error Correction Q or H."
        onChange={(v) => set("logo", v)}
        placeholder="https://example.com/logo.png"
        title="Logo URL"
        value={settings.logo}
      />
      <Form.TextField
        id="size"
        info="Output dimension in pixels."
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

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function GenerateQR() {
  const [result, setResult] = useState<{
    url: string;
    settings: Settings;
    qrProps: QRProps & { size: number };
  } | null>(null);

  if (result) {
    return (
      <QRPreview
        onEdit={() => setResult(null)}
        qrProps={result.qrProps}
        settings={result.settings}
        url={result.url}
      />
    );
  }

  return (
    <QRForm
      onGenerate={(url, settings) =>
        setResult({ url, settings, qrProps: buildQRProps(url, settings) })
      }
    />
  );
}
