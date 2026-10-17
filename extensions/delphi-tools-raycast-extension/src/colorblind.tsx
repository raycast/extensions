import { execFileAsync, getDelphitoolsCliPath } from "./utils/exec";
import type { LaunchProps } from "@raycast/api";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";

import {
  DelphitoolsInstallStatusView,
  getDelphitoolsInstallStatus,
} from "./delphitools-install";
import { createTempSolidSwatchSvg, normaliseHexColour } from "./swatch-png";

type ColorBlindnessType =
  | "normal"
  | "protanopia"
  | "deuteranopia"
  | "tritanopia"
  | "protanomaly"
  | "deuteranomaly"
  | "tritanomaly"
  | "achromatopsia"
  | "achromatomaly";

type ColorBlindnessResult = {
  colour: string;
  simulatedColour: string;
  type: ColorBlindnessType;
};

type ColorBlindnessCliResult = {
  colour: string;
  simulatedColour: string;
};

type SwatchPreview = {
  sourcePath: string;
  simulatedPath: string;
};

const DEFAULT_TYPE: ColorBlindnessType = "normal";
const SWATCH_NAMESPACE = "colorblind";

const COLOR_BLINDNESS_TYPES: Array<{
  label: string;
  value: ColorBlindnessType;
}> = [
  { label: "Normal", value: "normal" },
  { label: "Protanopia", value: "protanopia" },
  { label: "Deuteranopia", value: "deuteranopia" },
  { label: "Tritanopia", value: "tritanopia" },
  { label: "Protanomaly", value: "protanomaly" },
  { label: "Deuteranomaly", value: "deuteranomaly" },
  { label: "Tritanomaly", value: "tritanomaly" },
  { label: "Achromatopsia", value: "achromatopsia" },
  { label: "Achromatomaly", value: "achromatomaly" },
];

export default function Command(
  props: LaunchProps<{ arguments: Arguments.Colorblind }>,
) {
  return (
    <ColorBlindnessCommand
      initialColour={props.arguments.colour}
      initialType={getInitialColorBlindnessType(props.arguments.type)}
    />
  );
}

function ColorBlindnessCommand({
  initialColour,
  initialType = DEFAULT_TYPE,
}: {
  initialColour: string;
  initialType?: ColorBlindnessType;
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

  return <ColorBlindnessResultView colour={initialColour} type={initialType} />;
}

function ColorBlindnessResultView({
  colour,
  type,
}: {
  colour: string;
  type: ColorBlindnessType;
}) {
  const [result, setResult] = useState<ColorBlindnessResult>();
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!colour.trim()) {
      setResult(undefined);
      setError("Color is required.");
      setIsProcessing(false);
      return;
    }

    let isMounted = true;
    setIsProcessing(true);
    setError("");

    async function loadResult() {
      try {
        const nextResult = await runColorBlindnessSimulation(colour, type);

        if (!isMounted) {
          return;
        }

        setResult({
          colour: nextResult.colour,
          simulatedColour: nextResult.simulatedColour,
          type,
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
          title: "Could not simulate color blindness",
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
  }, [colour, type]);

  if (result) {
    return <ColorBlindnessDetail result={result} />;
  }

  return (
    <Detail
      isLoading={isProcessing}
      markdown={
        error
          ? ["# Could not simulate color blindness", "", error].join("\n")
          : "# Simulating color blindness..."
      }
    />
  );
}

function ColorBlindnessDetail({ result }: { result: ColorBlindnessResult }) {
  const [swatchPreview, setSwatchPreview] = useState<SwatchPreview>();
  const [swatchError, setSwatchError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function createPreview() {
      try {
        const nextSwatchPreview = {
          sourcePath: await createSwatchSvg(result.colour),
          simulatedPath: await createSwatchSvg(result.simulatedColour),
        };

        if (!isMounted) {
          return;
        }

        setSwatchPreview(nextSwatchPreview);
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
  }, [result.colour, result.simulatedColour]);

  async function copySimulatedColour() {
    await Clipboard.copy(result.simulatedColour);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied Simulated Color",
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
            title="Copy Simulated Color"
            onAction={copySimulatedColour}
          />
          <Action.CopyToClipboard
            icon={Icon.Clipboard}
            title="Copy Source Color"
            content={result.colour}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
          />
          {swatchPreview ? (
            <Action.CopyToClipboard
              icon={Icon.Clipboard}
              title="Copy Simulated Swatch Path"
              content={swatchPreview.simulatedPath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          ) : null}
          <ActionPanel.Section title="Switch Mode">
            {COLOR_BLINDNESS_TYPES.filter(
              (type) => type.value !== result.type,
            ).map((type) => (
              <Action.Push
                key={type.value}
                icon={Icon.Eye}
                title={`Show ${type.label}`}
                target={
                  <ColorBlindnessResultView
                    colour={result.colour}
                    type={type.value}
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
            title="Source Color"
            text={result.colour}
            icon={{ source: Icon.Circle, tintColor: result.colour }}
          />
          <Detail.Metadata.Label
            title="Simulated Color"
            text={result.simulatedColour}
            icon={{
              source: Icon.Circle,
              tintColor: result.simulatedColour,
            }}
          />
          <Detail.Metadata.Label
            title="Color Blindness Type"
            text={getColorBlindnessTypeLabel(result.type)}
          />
        </Detail.Metadata>
      }
    />
  );
}

async function runColorBlindnessSimulation(
  colour: string,
  type: ColorBlindnessType,
): Promise<ColorBlindnessCliResult> {
  const { stdout } = await execFileAsync(getDelphitoolsCliPath(), [
    "colorblind",
    "--json",
    "--colour",
    "--cb-type",
    type,
    colour,
  ]);

  return parseColourOutput(stdout);
}

function parseColourOutput(stdout: string): ColorBlindnessCliResult {
  const parsed = JSON.parse(stdout) as unknown;

  if (typeof parsed === "string") {
    const colour = normaliseHexColour(parsed);

    return {
      colour,
      simulatedColour: colour,
    };
  }

  if (parsed && typeof parsed === "object") {
    const output = parsed as Record<string, unknown>;

    for (const key of ["hex", "colour", "color", "result"]) {
      const value = output[key];

      if (typeof value === "string") {
        return {
          colour: getOriginalHex(output) ?? normaliseHexColour(value),
          simulatedColour: normaliseHexColour(value),
        };
      }
    }
  }

  throw new Error("Unexpected color blindness output from delphitools.");
}

function getInitialColorBlindnessType(
  type: string | undefined,
): ColorBlindnessType {
  return isColorBlindnessType(type) ? type : DEFAULT_TYPE;
}

function isColorBlindnessType(
  type: string | undefined,
): type is ColorBlindnessType {
  return COLOR_BLINDNESS_TYPES.some((item) => item.value === type);
}

function getColorBlindnessTypeLabel(type: ColorBlindnessType): string {
  return (
    COLOR_BLINDNESS_TYPES.find((item) => item.value === type)?.label ?? "Normal"
  );
}

function getDetailMarkdown(
  result: ColorBlindnessResult,
  swatchPreview: SwatchPreview | undefined,
  swatchError: string,
): string {
  if (swatchError) {
    return [
      `# ${getColorBlindnessTypeLabel(result.type)}`,
      "",
      "Could not generate swatch preview.",
      "",
      swatchError,
      "",
      `Source: \`${result.colour}\``,
      "",
      `Simulated: \`${result.simulatedColour}\``,
    ].join("\n");
  }

  if (!swatchPreview) {
    return [
      `# ${getColorBlindnessTypeLabel(result.type)}`,
      "",
      "Generating swatch preview...",
    ].join("\n");
  }

  return [
    `# ${getColorBlindnessTypeLabel(result.type)}`,
    "",
    `| Original | ${getColorBlindnessTypeLabel(result.type)} |`,
    "| --- | --- |",
    `| ![Original swatch](${swatchPreview.sourcePath}) | ![Simulated swatch](${swatchPreview.simulatedPath}) |`,
    `| \`${result.colour}\` | \`${result.simulatedColour}\` |`,
  ].join("\n");
}

function getOriginalHex(output: Record<string, unknown>): string | undefined {
  for (const key of ["original_hex", "originalHex", "input"]) {
    const value = output[key];

    if (typeof value === "string") {
      return normaliseHexColour(value);
    }
  }

  return undefined;
}

async function createSwatchSvg(colour: string): Promise<string> {
  return createTempSolidSwatchSvg({
    colour,
    namespace: SWATCH_NAMESPACE,
  });
}
