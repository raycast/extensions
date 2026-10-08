import { Form, Detail, ActionPanel, Action, Color, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import {
  analyze,
  DEFAULT_FONT_SIZE_PX,
  DEFAULT_FONT_WEIGHT,
  type ApcaWeight,
  type ContrastResult,
} from "./lib/contrast";
import { parseColor } from "./lib/color";

const WEIGHTS: ApcaWeight[] = [100, 200, 300, 400, 500, 600, 700, 800, 900];

/** Parse the font-size field; fall back to the default unless it is finite and > 0. */
function parseFontSize(raw: string): number {
  const n = Number(raw.trim());
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_FONT_SIZE_PX;
}

/** Whether a color string parses and carries partial transparency (alpha < 1). */
function hadAlpha(input: string): boolean {
  const parsed = parseColor(input);
  return parsed !== undefined && (parsed.alpha ?? 1) < 1;
}

const mark = (ok: boolean): string => (ok ? "✓" : "✗");

// --- Form (View 1): entry + live readout ------------------------------------

export default function Command() {
  const { push } = useNavigation();
  const [foreground, setForeground] = useState("");
  const [background, setBackground] = useState("");
  const [fontSizeRaw, setFontSizeRaw] = useState(String(DEFAULT_FONT_SIZE_PX));
  const [weightRaw, setWeightRaw] = useState(String(DEFAULT_FONT_WEIGHT));

  const fontSizePx = parseFontSize(fontSizeRaw);
  const fontWeight = Number(weightRaw) as ApcaWeight;

  const bothEmpty = foreground.trim() === "" && background.trim() === "";
  const result = analyze({ foreground, background, fontSizePx, fontWeight });
  const canCopyFix = result.valid && !result.fixForWcagAA.alreadyPasses;

  const readout = bothEmpty ? "Enter a foreground and background color to see the contrast." : buildReadout(result);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Show Result"
            icon={Icon.Eye}
            onSubmit={() => {
              if (result.valid) push(<ResultView result={result} />);
            }}
          />
          {canCopyFix && <Action.CopyToClipboard title="Copy Fix (Hex)" content={result.fixForWcagAA.hex} />}
          {canCopyFix && <Action.CopyToClipboard title="Copy Fix (OKLCH)" content={result.fixForWcagAA.oklch} />}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="foreground"
        title="Foreground"
        placeholder="#1d4ed8, rgb(...), or oklch(0.5 0.2 250)"
        value={foreground}
        onChange={setForeground}
      />
      <Form.TextField
        id="background"
        title="Background"
        placeholder="#ffffff"
        value={background}
        onChange={setBackground}
      />
      <Form.TextField
        id="fontSize"
        title="Font Size (px)"
        placeholder="16"
        value={fontSizeRaw}
        onChange={setFontSizeRaw}
      />
      <Form.Dropdown id="fontWeight" title="Font Weight" value={weightRaw} onChange={setWeightRaw}>
        {WEIGHTS.map((w) => (
          <Form.Dropdown.Item key={w} value={String(w)} title={String(w)} />
        ))}
      </Form.Dropdown>
      <Form.Description title="Contrast" text={readout} />
    </Form>
  );
}

/** Plain-text live readout for the form's Form.Description (no markdown). */
function buildReadout(result: ContrastResult): string {
  if (!result.valid) return result.error ?? "Invalid color.";

  const { wcag, apca, fixForWcagAA, input } = result;
  const lines: string[] = [];

  lines.push(`WCAG ${wcag.ratio.toFixed(2)}:1`);
  lines.push(`  AA  ${mark(wcag.aaNormal)} normal   ${mark(wcag.aaLarge)} large`);
  lines.push(`  AAA ${mark(wcag.aaaNormal)} normal   ${mark(wcag.aaaLarge)} large`);

  const polarity = apca.lc < 0 ? " · light text on dark" : "";
  lines.push(`APCA Lc ${apca.lc.toFixed(2)}${polarity}`);
  if (apca.minFontPx === null) {
    lines.push(`  ${mark(false)} not usable for fluent text at weight ${input.fontWeight}`);
  } else {
    lines.push(`  ${mark(apca.passesAtSize)} at ${input.fontSizePx}px / ${input.fontWeight} (min ${apca.minFontPx}px)`);
  }

  if (fixForWcagAA.alreadyPasses || wcag.aaNormal) {
    lines.push("Passes AA already.");
  } else {
    lines.push(`Fix → ${fixForWcagAA.hex}   ${fixForWcagAA.oklch}   (${fixForWcagAA.ratio.toFixed(2)}:1)`);
  }

  return lines.join("\n");
}

// --- Result (View 2): Detail with swatch + metadata -------------------------

function ResultView({ result }: { result: ContrastResult }) {
  const { pop } = useNavigation();
  const { wcag, apca, fixForWcagAA, input } = result;

  // A real fix is shown whenever the original needs changing (a passing color always
  // exists at the AA target).
  const hasRealFix = !fixForWcagAA.alreadyPasses;

  // Use the opaque colors actually scored so the swatch matches the numbers (a
  // translucent input previews as the composited color, not as opaque black).
  const fgHex = result.resolved.foreground;
  const bgHex = result.resolved.background;

  return (
    <Detail
      markdown={buildMarkdown(result, fgHex, bgHex)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="WCAG Ratio" text={`${wcag.ratio.toFixed(2)}:1`} />
          <Detail.Metadata.TagList title="WCAG AA">
            <Detail.Metadata.TagList.Item text="Normal" color={wcag.aaNormal ? Color.Green : Color.Red} />
            <Detail.Metadata.TagList.Item text="Large" color={wcag.aaLarge ? Color.Green : Color.Red} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="WCAG AAA">
            <Detail.Metadata.TagList.Item text="Normal" color={wcag.aaaNormal ? Color.Green : Color.Red} />
            <Detail.Metadata.TagList.Item text="Large" color={wcag.aaaLarge ? Color.Green : Color.Red} />
          </Detail.Metadata.TagList>

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label
            title="APCA Lc"
            text={`${apca.lc.toFixed(2)}  (${apca.lc < 0 ? "light text on dark" : "dark text on light"})`}
          />
          <Detail.Metadata.Label
            title={`Min Font · Weight ${input.fontWeight}`}
            text={apca.minFontPx === null ? "not usable at this weight" : `${apca.minFontPx}px`}
          />
          <Detail.Metadata.TagList title={`At ${input.fontSizePx}px · ${input.fontWeight}`}>
            <Detail.Metadata.TagList.Item
              text={apca.passesAtSize ? "Passes" : "Fails"}
              color={apca.passesAtSize ? Color.Green : Color.Red}
            />
          </Detail.Metadata.TagList>

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label
            title="Foreground"
            text={fgHex}
            icon={{ source: Icon.CircleFilled, tintColor: fgHex }}
          />
          <Detail.Metadata.Label
            title="Background"
            text={bgHex}
            icon={{ source: Icon.CircleFilled, tintColor: bgHex }}
          />

          <Detail.Metadata.Separator />

          {fixForWcagAA.alreadyPasses && (
            <Detail.Metadata.Label title="Suggested Fix" text="already passes WCAG AA — no change needed" />
          )}
          {hasRealFix && (
            <Detail.Metadata.Label
              title="Suggested Fix"
              text={fixForWcagAA.hex}
              icon={{ source: Icon.CircleFilled, tintColor: fixForWcagAA.hex }}
            />
          )}
          {hasRealFix && <Detail.Metadata.Label title="Suggested Fix (OKLCH)" text={fixForWcagAA.oklch} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {hasRealFix && <Action.CopyToClipboard title="Copy Fix (Hex)" content={fixForWcagAA.hex} />}
          {hasRealFix && <Action.CopyToClipboard title="Copy Fix (OKLCH)" content={fixForWcagAA.oklch} />}
          {hasRealFix && <Action.CopyToClipboard title="Copy Foreground (Hex)" content={fgHex} />}
          <Action title="Edit Colors" icon={Icon.Pencil} onAction={pop} />
        </ActionPanel>
      }
    />
  );
}

/** Build the Detail markdown: a heading plus one or two preview swatches. */
function buildMarkdown(result: ContrastResult, fgHex: string, bgHex: string): string {
  const { input, fixForWcagAA } = result;
  const parts: string[] = ["# Contrast Preview"];

  if (hadAlpha(input.foreground) || hadAlpha(input.background)) {
    parts.push("_Translucent input composited over its background before scoring._");
  }

  parts.push(`**Original** — \`${fgHex}\` on \`${bgHex}\``);
  parts.push(`![original](${swatch(bgHex, fgHex, "Original", input.fontSizePx, input.fontWeight)})`);

  if (fixForWcagAA.alreadyPasses) {
    parts.push("Already passes WCAG AA. No change needed.");
  } else {
    parts.push(`**Suggested fix** — \`${fixForWcagAA.hex}\` on \`${bgHex}\``);
    parts.push(
      `![suggested fix](${swatch(bgHex, fixForWcagAA.hex, "Suggested fix", input.fontSizePx, input.fontWeight)})`,
    );
  }

  return parts.join("\n\n");
}

/** Inline SVG data URI sample swatch: big label + body line in fg color on bg color. */
function swatch(bgHex: string, fgHex: string, label: string, sizePx: number, weight: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="120" viewBox="0 0 600 120">
    <rect width="600" height="120" rx="12" fill="${bgHex}"/>
    <text x="24" y="58" font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="${sizePx}" font-weight="${weight}" fill="${fgHex}">${label}</text>
    <text x="24" y="92" font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="13" fill="${fgHex}" opacity="0.75">The quick brown fox jumps over the lazy dog</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
