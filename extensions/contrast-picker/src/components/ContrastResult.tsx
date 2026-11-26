import { Action, ActionPanel, Color, Detail, Icon, Keyboard, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useMemo, useState } from "react";
import { CopyFormat, RGB, formatColor, nearestTailwind, parseColor, resolvePair, toHex } from "../lib/color";
import {
  ApcaFont,
  FONT_SIZES,
  FONT_WEIGHTS,
  analyze,
  formatLc,
  formatRatio,
  polarityLabel,
  targetLabel,
} from "../lib/contrast";
import { Fix, findAllFixes, primaryFix } from "../lib/fixes";
import { pickAgain } from "../lib/launch";
import { buildMarkdown, changedColors, fixTitle, plainReport } from "../lib/report";
import { getPreferences, useFontSettings } from "../lib/settings";
import { PickTarget } from "../lib/types";
import ContrastForm, { FormValues } from "./ContrastForm";

type Props = { foreground: string; background: string };

const FORMATS: { format: CopyFormat; title: string; key: Keyboard.KeyEquivalent }[] = [
  { format: "hex", title: "HEX", key: "1" },
  { format: "oklch", title: "OKLCH", key: "2" },
  { format: "rgb", title: "RGB", key: "3" },
  { format: "tailwind", title: "Tailwind", key: "4" },
];

export default function ContrastResult(props: Props) {
  const { push } = useNavigation();
  const preferences = getPreferences();
  const font = useFontSettings();
  const [colors, setColors] = useState({ foreground: props.foreground, background: props.background });

  const result = useMemo(() => {
    const parsedFg = parseColor(colors.foreground);
    const parsedBg = parseColor(colors.background);
    if (!parsedFg || !parsedBg) return undefined;
    const { fg, bg } = resolvePair(parsedFg, parsedBg);
    const report = analyze(fg, bg, font.sizePx, font.weight);
    const fixes = findAllFixes(fg, bg, font.sizePx, font.weight);
    const primary = primaryFix(fixes, preferences.fixTarget);
    const others = fixes.filter((fix) => fix !== primary);
    const notes: string[] = [];
    if (parsedFg.alpha < 1)
      notes.push(
        `Text color has ${Math.round(parsedFg.alpha * 100)}% opacity. It is blended over the background before the check.`,
      );
    if (parsedBg.alpha < 1)
      notes.push(`Background has ${Math.round(parsedBg.alpha * 100)}% opacity. It is shown over white.`);
    const markdown = buildMarkdown({
      fg,
      bg,
      report,
      sizePx: font.sizePx,
      weight: font.weight,
      target: preferences.fixTarget,
      primary,
      others,
      notes,
    });
    return { fg, bg, report, primary, others, markdown };
  }, [colors.foreground, colors.background, font.sizePx, font.weight, preferences.fixTarget]);

  function applyForm(values: FormValues) {
    setColors({ foreground: values.foreground, background: values.background });
    if (values.sizePx) font.setSize(values.sizePx);
    if (values.weight) font.setWeight(values.weight);
  }

  if (!result) {
    return (
      <ContrastForm
        foreground={colors.foreground}
        background={colors.background}
        sizePx={font.sizePx}
        weight={font.weight}
        onSubmit={applyForm}
      />
    );
  }

  const { fg, bg, report, primary, others, markdown } = result;
  const context = { foreground: colors.foreground, background: colors.background };
  const repick = (pick: PickTarget) => () => pickAgain(pick, context).catch((error) => showFailureToast(error));

  return (
    <Detail
      isLoading={font.isLoading}
      navigationTitle={`Contrast ${formatRatio(report.ratio)}`}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="WCAG Ratio" text={formatRatio(report.ratio)} />
          <Detail.Metadata.TagList title="WCAG AA">
            <PassTag text="Normal" pass={report.levels.aaNormal} />
            <PassTag text="Large" pass={report.levels.aaLarge} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="WCAG AAA">
            <PassTag text="Normal" pass={report.levels.aaaNormal} />
            <PassTag text="Large" pass={report.levels.aaaLarge} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="APCA Lc" text={`${formatLc(report.lc)} (${polarityLabel(report.lc)})`} />
          <Detail.Metadata.Label title={`Min Font · Weight ${font.weight}`} text={describeFont(report.apcaFont)} />
          <Detail.Metadata.TagList title={`At ${font.sizePx}px · ${font.weight}`}>
            <PassTag text={report.apcaPass ? "Passes" : "Fails"} pass={report.apcaPass} />
            {report.apcaRequired !== undefined && (
              <Detail.Metadata.TagList.Item text={`Needs Lc ${report.apcaRequired}`} />
            )}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <ColorLabel title="Text" rgb={fg} input={colors.foreground} />
          <ColorLabel title="Background" rgb={bg} input={colors.background} />
          {primary && <ColorLabel title="Fix Text" rgb={primary.fg} />}
          {primary && <ColorLabel title="Fix Background" rgb={primary.bg} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {primary ? (
            <ActionPanel.Section title={`Suggested Fix · ${targetLabel(primary.target)}`}>
              {orderFormats(preferences.copyFormat).map(({ format, title, key }) => (
                <Action.CopyToClipboard
                  key={format}
                  title={`Copy Fix as ${title}`}
                  content={copyValue(primary, format)}
                  shortcut={{ modifiers: ["cmd"], key }}
                />
              ))}
              <Action
                title="Use Fix"
                icon={Icon.Wand}
                shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                onAction={() => setColors({ foreground: toHex(primary.fg), background: toHex(primary.bg) })}
              />
            </ActionPanel.Section>
          ) : (
            <ActionPanel.Section title="Colors">
              <Action.CopyToClipboard title="Copy Text Color" content={formatColor(fg, preferences.copyFormat)} />
              <Action.CopyToClipboard title="Copy Background Color" content={formatColor(bg, preferences.copyFormat)} />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section title="Pick">
            <Action
              title="Pick Text Color"
              icon={Icon.EyeDropper}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={repick("foreground")}
            />
            <Action
              title="Pick Background Color"
              icon={Icon.EyeDropper}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
              onAction={repick("background")}
            />
            <Action
              title="Pick Both Colors"
              icon={Icon.EyeDropper}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onAction={repick("both")}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Adjust">
            <Action
              title="Swap Colors"
              icon={Icon.Switch}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={() => setColors({ foreground: colors.background, background: colors.foreground })}
            />
            <ActionPanel.Submenu title="Font Size" icon={Icon.Text} shortcut={{ modifiers: ["cmd"], key: "=" }}>
              {FONT_SIZES.map((size) => (
                <Action
                  key={size}
                  title={`${size} Pixels`}
                  icon={size === font.sizePx ? Icon.Checkmark : undefined}
                  onAction={() => font.setSize(size)}
                />
              ))}
            </ActionPanel.Submenu>
            <ActionPanel.Submenu
              title="Font Weight"
              icon={Icon.Bold}
              shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
            >
              {FONT_WEIGHTS.map((weight) => (
                <Action
                  key={weight}
                  title={String(weight)}
                  icon={weight === font.weight ? Icon.Checkmark : undefined}
                  onAction={() => font.setWeight(weight)}
                />
              ))}
            </ActionPanel.Submenu>
            <Action
              title="Edit Colors"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              onAction={() =>
                push(
                  <ContrastForm
                    foreground={colors.foreground}
                    background={colors.background}
                    sizePx={font.sizePx}
                    weight={font.weight}
                    onSubmit={applyForm}
                    popOnSubmit
                  />,
                )
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            {others.length > 0 && (
              <ActionPanel.Submenu title="Copy Other Fix" icon={Icon.List} shortcut={{ modifiers: ["cmd"], key: "l" }}>
                {others.map((fix) => (
                  <Action.CopyToClipboard
                    key={`${fix.target}-${fix.mode}`}
                    title={`${fixTitle(fix)} — ${copyValue(fix, preferences.copyFormat)}`}
                    content={copyValue(fix, preferences.copyFormat)}
                  />
                ))}
              </ActionPanel.Submenu>
            )}
            <Action.CopyToClipboard
              title="Copy Report"
              shortcut={Keyboard.Shortcut.Common.Copy}
              content={plainReport(fg, bg, report, font.sizePx, font.weight, primary)}
            />
            <Action.CopyToClipboard
              title="Copy Original Colors"
              content={`${formatColor(fg, preferences.copyFormat)} on ${formatColor(bg, preferences.copyFormat)}`}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/** Puts the preferred format first so it becomes the primary (↵) action. Shortcuts stay the same. */
function orderFormats(preferred: CopyFormat) {
  return [...FORMATS].sort((a, b) => Number(b.format === preferred) - Number(a.format === preferred));
}

function PassTag({ text, pass }: { text: string; pass: boolean }) {
  return (
    <Detail.Metadata.TagList.Item
      text={text}
      color={pass ? Color.Green : Color.Red}
      icon={pass ? Icon.CheckCircle : Icon.XMarkCircle}
    />
  );
}

function ColorLabel({ title, rgb, input }: { title: string; rgb: RGB; input?: string }) {
  const hex = toHex(rgb);
  const tailwind = nearestTailwind(rgb);
  const showInput = input && input.trim().toLowerCase() !== hex;
  const text = `${hex}${showInput ? ` (${input.trim()})` : ""} · ${tailwind.exact ? "" : "≈ "}${tailwind.name}`;
  return <Detail.Metadata.Label title={title} text={text} icon={{ source: Icon.CircleFilled, tintColor: hex }} />;
}

function describeFont(font: ApcaFont): string {
  if (font.kind === "invisible") return "Not readable";
  if (font.kind === "nonText") return "Non-text only (icons, borders)";
  return `${font.px}px`;
}

/** The value to paste: the changed color, or both colors as CSS when the fix changes both. */
function copyValue(fix: Fix, format: CopyFormat): string {
  const colors = changedColors(fix);
  if (colors.length === 1) return formatColor(colors[0], format);
  if (format === "tailwind") return `text-${formatColor(fix.fg, format)} bg-${formatColor(fix.bg, format)}`;
  return `color: ${formatColor(fix.fg, format)};\nbackground-color: ${formatColor(fix.bg, format)};`;
}
