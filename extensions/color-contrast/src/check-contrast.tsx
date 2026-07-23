import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  LaunchProps,
  LaunchType,
  open,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { crossLaunchCommand } from "raycast-cross-extension";
import { useState } from "react";
import { EditColors } from "./components/EditColors";
import {
  composite,
  contrastRatio,
  formatCmyk,
  formatHsb,
  formatRgb,
  parseColor,
  RGB,
  rgbToCmyk,
  rgbToHsb,
  toHex,
} from "./lib/color";
import { previewImage } from "./lib/preview";
import { grade, suggestForeground, THRESHOLDS } from "./lib/wcag";

const WHITE: RGB = { r: 255, g: 255, b: 255, a: 1 };

type PickCallback = {
  field?: ColorField;
  hex?: string;
  foreground?: string;
  background?: string;
};

type ColorField = "foreground" | "background";

export default function CheckContrast(
  props: LaunchProps<{
    arguments: Arguments.CheckContrast;
    launchContext?: PickCallback;
  }>,
) {
  const ctx = props.launchContext;
  const [foreground, setForeground] = useState(
    ctx?.field === "foreground" && ctx.hex
      ? ctx.hex
      : (ctx?.foreground ?? (props.arguments.foreground || "#1A1A1A")),
  );
  const [background, setBackground] = useState(
    ctx?.field === "background" && ctx.hex
      ? ctx.hex
      : (ctx?.background ?? (props.arguments.background || "#FFFFFF")),
  );

  const fg = parseColor(foreground);
  const bg = parseColor(background);

  async function pick(
    field: ColorField,
    command: "pick-color" | "color-wheel",
  ) {
    try {
      await crossLaunchCommand(
        {
          name: command,
          type: LaunchType.UserInitiated,
          extensionName: "color-picker",
          ownerOrAuthorName: "thomas",
        },
        { context: { field, foreground, background } },
      );
    } catch {
      await open("raycast://extensions/thomas/color-picker");
    }
  }

  const editAction = (
    <Action.Push
      title="Edit Colors"
      icon={Icon.Pencil}
      target={
        <EditColors
          foreground={foreground}
          background={background}
          onSubmit={(nextFg, nextBg) => {
            setForeground(nextFg);
            setBackground(nextBg);
          }}
        />
      }
    />
  );

  const pickActions = (
    <ActionPanel.Section title="Pick a Color">
      <Action
        title="Pick Foreground from Screen"
        icon={Icon.EyeDropper}
        shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
        onAction={() => pick("foreground", "pick-color")}
      />
      <Action
        title="Pick Background from Screen"
        icon={Icon.EyeDropper}
        shortcut={{ modifiers: ["cmd", "opt"], key: "e" }}
        onAction={() => pick("background", "pick-color")}
      />
      <Action
        title="Pick Foreground from Color Wheel"
        icon={Icon.CircleProgress}
        shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
        onAction={() => pick("foreground", "color-wheel")}
      />
      <Action
        title="Pick Background from Color Wheel"
        icon={Icon.CircleProgress}
        shortcut={{ modifiers: ["cmd", "opt"], key: "w" }}
        onAction={() => pick("background", "color-wheel")}
      />
    </ActionPanel.Section>
  );

  if (!fg || !bg) {
    return (
      <Detail
        markdown={`# Enter valid colors\n\nCouldn't read the ${!fg ? "foreground" : "background"} color.\n\nPress **⏎** to edit. Accepts HEX, RGB, HSL, or CSS color names — for example \`#1A1A1A\`, \`rgb(26 26 26)\`, or \`black\`.`}
        actions={
          <ActionPanel>
            {editAction}
            {pickActions}
          </ActionPanel>
        }
      />
    );
  }

  const solidBackground = composite(bg, WHITE);
  const solidForeground = composite(fg, solidBackground);
  const fgHex = toHex(solidForeground).toUpperCase();
  const bgHex = toHex(solidBackground).toUpperCase();
  const fgCmyk = formatCmyk(rgbToCmyk(solidForeground));
  const bgCmyk = formatCmyk(rgbToCmyk(solidBackground));
  const fgRgb = formatRgb(solidForeground);
  const bgRgb = formatRgb(solidBackground);
  const fgHsb = formatHsb(rgbToHsb(solidForeground));
  const bgHsb = formatHsb(rgbToHsb(solidBackground));

  const ratio = contrastRatio(fg, bg);
  const grades = grade(ratio);

  function suggest(target: number, label: string) {
    if (!fg || !bg) {
      return;
    }
    const suggestion = suggestForeground(fg, bg, target);
    if (!suggestion) {
      return;
    }
    setForeground(suggestion.hex.toUpperCase());
    if (suggestion.reachedTarget) {
      showToast({
        style: Toast.Style.Success,
        title: `${label} foreground: ${suggestion.hex.toUpperCase()}`,
        message: `${suggestion.ratio.toFixed(2)} : 1`,
      });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: `Can't reach ${label} on this background`,
        message: `Closest: ${suggestion.hex.toUpperCase()} · ${suggestion.ratio.toFixed(2)} : 1`,
      });
    }
  }

  const markdown = `<img src="${previewImage(fgHex, bgHex)}" alt="Preview" />\n\n# ${ratio.toFixed(2)} : 1\n\n${verdict(grades)}`;
  const report = buildReport(fgHex, bgHex, fgCmyk, bgCmyk, ratio, grades);

  const dot = (pass: boolean) => ({
    source: Icon.CircleFilled,
    tintColor: pass ? Color.Green : Color.Red,
  });
  const overall =
    ratio >= THRESHOLDS.aaaNormal
      ? { text: "AAA", color: Color.Green }
      : ratio >= THRESHOLDS.aaNormal
        ? { text: "AA", color: Color.Green }
        : ratio >= THRESHOLDS.aaLarge
          ? { text: "AA · large text", color: Color.Orange }
          : { text: "Fail", color: Color.Red };

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${fgHex} on ${bgHex}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Foreground"
            text={fgHex}
            icon={{ source: Icon.CircleFilled, tintColor: fgHex }}
          />
          <Detail.Metadata.Label title="RGB" text={fgRgb} />
          <Detail.Metadata.Label title="HSB" text={fgHsb} />
          <Detail.Metadata.Label title="CMYK" text={fgCmyk} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Background"
            text={bgHex}
            icon={{ source: Icon.CircleFilled, tintColor: bgHex }}
          />
          <Detail.Metadata.Label title="RGB" text={bgRgb} />
          <Detail.Metadata.Label title="HSB" text={bgHsb} />
          <Detail.Metadata.Label title="CMYK" text={bgCmyk} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Contrast Ratio"
            text={`${ratio.toFixed(2)} : 1`}
          />
          <Detail.Metadata.TagList title="Grade">
            <Detail.Metadata.TagList.Item
              text={overall.text}
              color={overall.color}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Normal Text">
            <Detail.Metadata.TagList.Item
              text="AA"
              icon={dot(grades.aaNormal)}
            />
            <Detail.Metadata.TagList.Item
              text="AAA"
              icon={dot(grades.aaaNormal)}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Large Text">
            <Detail.Metadata.TagList.Item
              text="AA"
              icon={dot(grades.aaLarge)}
            />
            <Detail.Metadata.TagList.Item
              text="AAA"
              icon={dot(grades.aaaLarge)}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="UI & Graphics">
            <Detail.Metadata.TagList.Item
              text="3:1"
              icon={dot(grades.uiComponents)}
            />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {editAction}
          {pickActions}
          <Action
            title="Swap Colors"
            icon={Icon.Switch}
            shortcut={Keyboard.Shortcut.Common.Save}
            onAction={() => {
              setForeground(background);
              setBackground(foreground);
            }}
          />
          {!grades.aaNormal ? (
            <Action
              title="Suggest Foreground for AA"
              icon={Icon.Wand}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
              onAction={() => suggest(THRESHOLDS.aaNormal, "AA")}
            />
          ) : null}
          {!grades.aaaNormal ? (
            <Action
              title="Suggest Foreground for AAA"
              icon={Icon.Wand}
              shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
              onAction={() => suggest(THRESHOLDS.aaaNormal, "AAA")}
            />
          ) : null}
          <Action.CopyToClipboard
            title="Copy Report"
            content={report}
            icon={Icon.Clipboard}
          />
          <Action.CopyToClipboard
            title="Copy Foreground Hex"
            content={fgHex}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <Action.CopyToClipboard
            title="Copy Background Hex"
            content={bgHex}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
          />
        </ActionPanel>
      }
    />
  );
}

function verdict(grades: ReturnType<typeof grade>): string {
  if (grades.aaaNormal) {
    return "🟢 Excellent — passes AAA for all text.";
  }
  if (grades.aaNormal) {
    return "🟢 Good — passes AA for all text.";
  }
  if (grades.aaLarge) {
    return "🟠 Passes AA for large text only.";
  }
  return "🔴 Fails AA — hard to read.";
}

function buildReport(
  fgHex: string,
  bgHex: string,
  fgCmyk: string,
  bgCmyk: string,
  ratio: number,
  grades: ReturnType<typeof grade>,
): string {
  const mark = (pass: boolean) => (pass ? "Pass" : "Fail");
  return [
    `Foreground: ${fgHex} · cmyk(${fgCmyk})`,
    `Background: ${bgHex} · cmyk(${bgCmyk})`,
    `Contrast ratio: ${ratio.toFixed(2)}:1`,
    "",
    `Normal text — AA: ${mark(grades.aaNormal)}, AAA: ${mark(grades.aaaNormal)}`,
    `Large text — AA: ${mark(grades.aaLarge)}, AAA: ${mark(grades.aaaLarge)}`,
    `UI & graphics — ${mark(grades.uiComponents)}`,
  ].join("\n");
}
