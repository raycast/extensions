import type { LaunchProps } from "@raycast/api";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  Keyboard,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";

import {
  DelphitoolsInstallStatusView,
  getDelphitoolsInstallStatus,
} from "./delphitools-install";
import { createTempSolidSwatchSvg } from "./swatch-png";
import { hexToRgb, rgbToHex } from "./utils/color";
import { execFileAsync, getDelphitoolsCliPath } from "./utils/exec";

type HarmonyType =
  | "complementary"
  | "analogous"
  | "triadic"
  | "split-complementary"
  | "tetradic"
  | "monochromatic"
  | "double-complementary"
  | "compound"
  | "pentadic"
  | "analogous-accent"
  | "golden"
  | "near-complementary";

type CliHarmonyType =
  | "complementary"
  | "analogous"
  | "triadic"
  | "tetradic"
  | "split";

type HarmonyResult = {
  colour: string;
  harmonyType: HarmonyType;
  colours: string[];
};

type HarmonySwatchPreview = {
  paths: string[];
};

const DEFAULT_HARMONY_TYPE: HarmonyType = "complementary";
const SWATCH_NAMESPACE = "harmony";

const HARMONY_TYPES: Array<{ label: string; value: HarmonyType }> = [
  { label: "Complementary", value: "complementary" },
  { label: "Analogous", value: "analogous" },
  { label: "Triadic", value: "triadic" },
  { label: "Split-Complementary", value: "split-complementary" },
  { label: "Tetradic (Square)", value: "tetradic" },
  { label: "Monochromatic", value: "monochromatic" },
  { label: "Double Complementary", value: "double-complementary" },
  { label: "Compound", value: "compound" },
  { label: "Pentadic", value: "pentadic" },
  { label: "Analogous Accent", value: "analogous-accent" },
  { label: "Golden Ratio", value: "golden" },
  { label: "Near Complementary", value: "near-complementary" },
];

export default function Command(
  props: LaunchProps<{ arguments: Arguments.Harmony }>,
) {
  return (
    <HarmonyCommand
      initialColour={props.arguments.colour}
      initialHarmonyType={getInitialHarmonyType(props.arguments.harmonyType)}
    />
  );
}

function HarmonyCommand({
  initialColour,
  initialHarmonyType = DEFAULT_HARMONY_TYPE,
}: {
  initialColour: string;
  initialHarmonyType?: HarmonyType;
}) {
  const [isDelphitoolsInstalled, setIsDelphitoolsInstalled] =
    useState<boolean>();

  useEffect(() => {
    async function checkInstallStatus() {
      const status = await getDelphitoolsInstallStatus();

      setIsDelphitoolsInstalled(status.installed);
    }

    checkInstallStatus();
  }, []);

  if (isDelphitoolsInstalled === false) {
    return <DelphitoolsInstallStatusView status={{ installed: false }} />;
  }

  return (
    <HarmonyResultView
      colour={initialColour}
      harmonyType={initialHarmonyType}
    />
  );
}

function HarmonyResultView({
  colour,
  harmonyType,
}: {
  colour: string;
  harmonyType: HarmonyType;
}) {
  const [result, setResult] = useState<HarmonyResult>();
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!colour.trim()) {
      setResult(undefined);
      setError("Base color is required.");
      setIsProcessing(false);
      return;
    }

    let isMounted = true;
    setIsProcessing(true);
    setError("");

    async function loadResult() {
      try {
        const colours = await runHarmony(colour, harmonyType);

        if (!isMounted) {
          return;
        }

        setResult({
          colour,
          harmonyType,
          colours,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (!isMounted) {
          return;
        }

        setError(message);
        setResult(undefined);
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not generate harmony",
          message,
        });
      } finally {
        if (isMounted) {
          setIsProcessing(false);
        }
      }
    }

    loadResult();

    return () => {
      isMounted = false;
    };
  }, [colour, harmonyType]);

  if (result) {
    return <HarmonyDetail result={result} />;
  }

  return (
    <Detail
      isLoading={isProcessing}
      markdown={
        error
          ? ["# Could not generate harmony", "", error].join("\n")
          : "# Generating harmony..."
      }
    />
  );
}

function HarmonyDetail({ result }: { result: HarmonyResult }) {
  const [swatchPreview, setSwatchPreview] = useState<HarmonySwatchPreview>();
  const [swatchError, setSwatchError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function createPreview() {
      try {
        const paths = await Promise.all(
          result.colours.map((colour) =>
            createTempSolidSwatchSvg({
              colour,
              namespace: SWATCH_NAMESPACE,
            }),
          ),
        );

        if (!isMounted) {
          return;
        }

        setSwatchPreview({ paths });
        setSwatchError("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSwatchPreview(undefined);
        setSwatchError(error instanceof Error ? error.message : String(error));
      }
    }

    createPreview();

    return () => {
      isMounted = false;
    };
  }, [result.colours]);

  async function copyColours() {
    await Clipboard.copy(result.colours.join("\n"));
    await showToast({
      style: Toast.Style.Success,
      title: "Copied Harmony Colors",
    });
  }

  async function copyCssVariables() {
    await Clipboard.copy(formatCssVariables(result));
    await showToast({
      style: Toast.Style.Success,
      title: "Copied CSS Variables",
    });
  }

  return (
    <Detail
      isLoading={!swatchPreview && !swatchError}
      markdown={getDetailMarkdown(result, swatchPreview, swatchError)}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Clipboard}
            title="Copy Harmony Colors"
            onAction={copyColours}
          />
          <Action
            icon={Icon.Code}
            title="Copy CSS Variables"
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={copyCssVariables}
          />
          {result.colours.map((colour, index) => (
            <Action.CopyToClipboard
              key={`${colour}-${index}`}
              icon={Icon.Clipboard}
              title={`Copy Color ${index + 1}`}
              content={colour}
              shortcut={
                index < 9
                  ? {
                      modifiers: ["cmd"],
                      key: String(index + 1) as Keyboard.KeyEquivalent,
                    }
                  : undefined
              }
            />
          ))}
          {swatchPreview
            ? swatchPreview.paths.map((filePath, index) => (
                <Action.CopyToClipboard
                  key={filePath}
                  icon={Icon.Clipboard}
                  title={`Copy Swatch ${index + 1} Path`}
                  content={filePath}
                />
              ))
            : null}
          <ActionPanel.Section title="Switch Harmony">
            {HARMONY_TYPES.filter(
              (harmonyType) => harmonyType.value !== result.harmonyType,
            ).map((harmonyType) => (
              <Action.Push
                key={harmonyType.value}
                icon={Icon.Eye}
                title={`Show ${harmonyType.label}`}
                target={
                  <HarmonyResultView
                    colour={result.colour}
                    harmonyType={harmonyType.value}
                  />
                }
              />
            ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Base Color"
            text={result.colours[0] ?? result.colour}
            icon={{
              source: Icon.Circle,
              tintColor: result.colours[0] ?? result.colour,
            }}
          />
          <Detail.Metadata.Label
            title="Harmony Type"
            text={getHarmonyTypeLabel(result.harmonyType)}
          />
          <Detail.Metadata.Separator />
          {result.colours.map((colour, index) => (
            <Detail.Metadata.Label
              key={`${colour}-${index}`}
              title={`Color ${index + 1}`}
              text={colour}
              icon={{ source: Icon.Circle, tintColor: colour }}
            />
          ))}
        </Detail.Metadata>
      }
    />
  );
}

async function runHarmony(
  colour: string,
  harmonyType: HarmonyType,
): Promise<string[]> {
  const cliHarmonyType = getCliHarmonyType(harmonyType);

  if (cliHarmonyType) {
    const { stdout } = await execFileAsync(getDelphitoolsCliPath(), [
      "harmony",
      "--json",
      colour,
      cliHarmonyType,
    ]);
    const parsed = JSON.parse(stdout) as unknown;

    if (
      !Array.isArray(parsed) ||
      !parsed.every((value) => typeof value === "string")
    ) {
      throw new Error("Unexpected harmony output from delphitools.");
    }

    return parsed;
  }

  const baseHex = await normaliseColour(colour);

  return getLocalHarmony(baseHex, harmonyType);
}

async function normaliseColour(colour: string): Promise<string> {
  const { stdout } = await execFileAsync(getDelphitoolsCliPath(), [
    "colour",
    "--json",
    colour,
    "hex",
  ]);
  const parsed = JSON.parse(stdout) as { hex?: unknown };

  if (typeof parsed.hex !== "string") {
    throw new Error("Unexpected color output from delphitools.");
  }

  return parsed.hex;
}

function getCliHarmonyType(
  harmonyType: HarmonyType,
): CliHarmonyType | undefined {
  switch (harmonyType) {
    case "complementary":
    case "analogous":
    case "triadic":
    case "tetradic":
      return harmonyType;
    case "split-complementary":
      return "split";
    default:
      return undefined;
  }
}

function getInitialHarmonyType(harmonyType: string | undefined): HarmonyType {
  return isHarmonyType(harmonyType) ? harmonyType : DEFAULT_HARMONY_TYPE;
}

function isHarmonyType(
  harmonyType: string | undefined,
): harmonyType is HarmonyType {
  return HARMONY_TYPES.some((item) => item.value === harmonyType);
}

function getHarmonyTypeLabel(harmonyType: HarmonyType): string {
  return (
    HARMONY_TYPES.find((item) => item.value === harmonyType)?.label ??
    "Complementary"
  );
}

function getDetailMarkdown(
  result: HarmonyResult,
  swatchPreview: HarmonySwatchPreview | undefined,
  swatchError: string,
): string {
  if (swatchError) {
    return [
      `# ${getHarmonyTypeLabel(result.harmonyType)}`,
      "",
      "Could not generate swatch preview.",
      "",
      swatchError,
      "",
      result.colours.map((colour) => `- \`${colour}\``).join("\n"),
    ].join("\n");
  }

  if (!swatchPreview) {
    return [
      `# ${getHarmonyTypeLabel(result.harmonyType)}`,
      "",
      "Generating swatch preview...",
    ].join("\n");
  }

  return [
    `# ${getHarmonyTypeLabel(result.harmonyType)}`,
    "",
    getSwatchTableMarkdown(result.colours, swatchPreview.paths),
  ].join("\n");
}

function getSwatchTableMarkdown(colours: string[], paths: string[]): string {
  return [
    "| Color | Hex |",
    "| --- | --- |",
    ...colours.map(
      (colour, index) =>
        `| ![Color ${index + 1} swatch](${paths[index]}) | \`${colour}\` |`,
    ),
  ].join("\n");
}

function getLocalHarmony(baseHex: string, harmonyType: HarmonyType): string[] {
  const baseRgb = hexToRgb(baseHex);

  if (!baseRgb) {
    throw new Error(`Invalid color: ${baseHex}`);
  }

  const [hue, saturation, lightness] = rgbToHsl(baseRgb);

  if (harmonyType === "monochromatic") {
    return [
      hslToHex(hue, saturation, clamp(lightness - 0.22)),
      hslToHex(hue, saturation, lightness),
      hslToHex(hue, saturation, clamp(lightness + 0.18)),
      hslToHex(hue, clamp(saturation * 0.55), clamp(lightness + 0.32)),
    ];
  }

  return getHarmonyOffsets(harmonyType).map((offset) =>
    hslToHex(rotateHue(hue + offset), saturation, lightness),
  );
}

function getHarmonyOffsets(harmonyType: HarmonyType): number[] {
  switch (harmonyType) {
    case "double-complementary":
      return [0, 30, 180, 210];
    case "compound":
      return [0, 150, 180, 210];
    case "pentadic":
      return [0, 72, 144, 216, 288];
    case "analogous-accent":
      return [0, 30, -30, 180];
    case "golden":
      return [0, 137.5, 275];
    case "near-complementary":
      return [0, 165, 195];
    default:
      return [0];
  }
}

function rgbToHsl(
  rgb: readonly [number, number, number],
): [number, number, number] {
  const red = rgb[0] / 255;
  const green = rgb[1] / 255;
  const blue = rgb[2] / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;

  if (max === min) {
    return [0, 0, lightness];
  }

  const delta = max - min;
  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;

  if (max === red) {
    hue = (green - blue) / delta + (green < blue ? 6 : 0);
  } else if (max === green) {
    hue = (blue - red) / delta + 2;
  } else {
    hue = (red - green) / delta + 4;
  }

  return [hue * 60, saturation, lightness];
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = rotateHue(hue) / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const match = lightness - chroma / 2;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime < 1) {
    red = chroma;
    green = x;
  } else if (huePrime < 2) {
    red = x;
    green = chroma;
  } else if (huePrime < 3) {
    green = chroma;
    blue = x;
  } else if (huePrime < 4) {
    green = x;
    blue = chroma;
  } else if (huePrime < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  return rgbToHex([
    Math.round((red + match) * 255),
    Math.round((green + match) * 255),
    Math.round((blue + match) * 255),
  ]);
}

function rotateHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function formatCssVariables(result: HarmonyResult): string {
  return result.colours
    .map((colour, index) => `--harmony-${index + 1}: ${colour};`)
    .join("\n");
}
