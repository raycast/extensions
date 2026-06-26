import { execFileAsync, getDelphitoolsCliPath } from "./utils/exec";
import type { LaunchProps } from "@raycast/api";
import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";

import {
  DelphitoolsInstallStatusView,
  getDelphitoolsInstallStatus,
} from "./delphitools-install";

type ShadeMode = "classic" | "vivid" | "muted" | "hue-shift";

type Shade = {
  name: string;
  hex: string;
  oklch?: string;
};

type TailwindShadesResult = {
  colour: string;
  colourName: string;
  mode: ShadeMode;
  shades: Shade[];
};

const DEFAULT_COLOUR_NAME = "primary";
const DEFAULT_MODE: ShadeMode = "classic";
const SHADE_ORDER = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "950",
];

const SHADE_MODES: Array<{
  label: string;
  value: ShadeMode;
  description: string;
}> = [
  {
    label: "Classic",
    value: "classic",
    description: "Standard Tailwind-style generation with uniform hue",
  },
  {
    label: "Vivid",
    value: "vivid",
    description: "Higher chroma shades for stronger color scales",
  },
  {
    label: "Muted",
    value: "muted",
    description: "Lower chroma shades for quieter interface palettes",
  },
  {
    label: "Hue Shift",
    value: "hue-shift",
    description: "Subtle hue shifts across light and dark shades",
  },
];

export default function Command(
  props: LaunchProps<{ arguments: Arguments.TailwindShades }>,
) {
  return (
    <TailwindShadesCommand
      colour={props.arguments.colour}
      initialMode={getInitialShadeMode(props.arguments.mode)}
    />
  );
}

function TailwindShadesCommand({
  colour,
  initialMode = DEFAULT_MODE,
}: {
  colour: string;
  initialMode?: ShadeMode;
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

  return <TailwindShadesList colour={colour} mode={initialMode} />;
}

function TailwindShadesList({
  colour,
  mode,
}: {
  colour: string;
  mode: ShadeMode;
}) {
  const [selectedMode, setSelectedMode] = useState(mode);
  const [result, setResult] = useState<TailwindShadesResult>();
  const [isProcessing, setIsProcessing] = useState(false);
  const lastToastErrorRef = useRef("");

  useEffect(() => {
    if (!colour.trim()) {
      setResult(undefined);
      lastToastErrorRef.current = "";
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);

    async function loadShades() {
      const toastErrorKey = `${selectedMode}:${colour}`;

      try {
        const shades = await runTailwindShades(colour, selectedMode);
        setResult({
          colour,
          colourName: DEFAULT_COLOUR_NAME,
          mode: selectedMode,
          shades,
        });
        lastToastErrorRef.current = "";
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const nextToastErrorKey = `${toastErrorKey}:${message}`;

        setResult(undefined);

        if (lastToastErrorRef.current !== nextToastErrorKey) {
          lastToastErrorRef.current = nextToastErrorKey;
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not generate Tailwind shades",
            message,
          });
        }
      } finally {
        setIsProcessing(false);
      }
    }

    loadShades();
  }, [colour, selectedMode]);

  return (
    <List
      isLoading={isProcessing}
      searchBarPlaceholder="Search shades..."
      actions={
        result ? (
          <TailwindShadesActions
            result={result}
            onChangeMode={setSelectedMode}
          />
        ) : undefined
      }
    >
      {result
        ? result.shades.map((shade) => (
            <List.Item
              key={shade.name}
              title={`${result.colourName}-${shade.name}`}
              subtitle={shade.hex}
              icon={{ source: Icon.Circle, tintColor: shade.hex }}
              accessories={[
                { text: shade.oklch },
                { text: getShadeModeLabel(result.mode) },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    icon={Icon.Clipboard}
                    title="Copy Shade Hex"
                    content={shade.hex}
                  />
                  {shade.oklch ? (
                    <Action.CopyToClipboard
                      icon={Icon.Clipboard}
                      title="Copy Shade OKLCH"
                      content={shade.oklch}
                    />
                  ) : null}
                  <Action.CopyToClipboard
                    icon={Icon.Code}
                    title="Copy CSS Variable"
                    content={`--${result.colourName}-${shade.name}: ${shade.hex};`}
                  />
                  <ActionPanel.Section>
                    <TailwindShadesCopyActions result={result} />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Generation Mode">
                    <TailwindShadesModeActions
                      currentMode={result.mode}
                      onChangeMode={setSelectedMode}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))
        : null}
    </List>
  );
}

function TailwindShadesActions({
  result,
  onChangeMode,
}: {
  result: TailwindShadesResult;
  onChangeMode: (mode: ShadeMode) => void;
}) {
  return (
    <ActionPanel>
      <Action.CopyToClipboard
        icon={Icon.Code}
        title="Copy CSS Variables"
        content={formatCssVariables(result)}
      />
      <TailwindShadesCopyActions result={result} />
      <ActionPanel.Section title="Generation Mode">
        <TailwindShadesModeActions
          currentMode={result.mode}
          onChangeMode={onChangeMode}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function TailwindShadesModeActions({
  currentMode,
  onChangeMode,
}: {
  currentMode: ShadeMode;
  onChangeMode: (mode: ShadeMode) => void;
}) {
  return (
    <>
      {SHADE_MODES.filter((mode) => mode.value !== currentMode).map((mode) => (
        <Action
          key={mode.value}
          icon={Icon.ArrowClockwise}
          title={`Switch to ${mode.label}`}
          onAction={() => onChangeMode(mode.value)}
        />
      ))}
    </>
  );
}

function TailwindShadesCopyActions({
  result,
}: {
  result: TailwindShadesResult;
}) {
  return (
    <>
      <Action.CopyToClipboard
        icon={Icon.List}
        title="Copy Shade Scale"
        content={formatShadeScale(result)}
        shortcut={{ modifiers: ["cmd"], key: "s" }}
      />
      <Action.CopyToClipboard
        icon={Icon.Code}
        title="Copy CSS Variables (OKLCH)"
        content={formatOklchCssVariables(result)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
      />
      <Action.CopyToClipboard
        icon={Icon.Code}
        title="Copy Tailwind Config"
        content={formatTailwindConfig(result)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
      <Action.CopyToClipboard
        icon={Icon.Clipboard}
        title="Copy Base Color"
        content={result.colour}
        shortcut={{ modifiers: ["cmd"], key: "b" }}
      />
    </>
  );
}

async function runTailwindShades(
  colour: string,
  mode: ShadeMode,
): Promise<Shade[]> {
  const { stdout } = await execFileAsync(getDelphitoolsCliPath(), [
    "tailwind-shades",
    "--json",
    colour,
    mode,
  ]);
  const parsed = JSON.parse(stdout) as unknown;

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Unexpected Tailwind shades output from delphitools.");
  }

  const shadeRecord = parsed as Record<string, unknown>;
  const shades = SHADE_ORDER.map((name) => {
    const hex = shadeRecord[name];

    if (typeof hex !== "string") {
      throw new Error("Unexpected Tailwind shades output from delphitools.");
    }

    return { name, hex };
  });
  const oklchValues = await Promise.all(
    shades.map((shade) => getOklchColour(shade.hex)),
  );

  return shades.map((shade, index) => ({
    ...shade,
    oklch: oklchValues[index],
  }));
}

async function getOklchColour(colour: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync(getDelphitoolsCliPath(), [
      "colour",
      "--json",
      colour,
      "oklch",
    ]);
    const parsed = JSON.parse(stdout) as { oklch?: unknown };

    return typeof parsed.oklch === "string" ? parsed.oklch : undefined;
  } catch {
    return undefined;
  }
}

function getInitialShadeMode(mode: string | undefined): ShadeMode {
  return isShadeMode(mode) ? mode : DEFAULT_MODE;
}

function isShadeMode(mode: string | undefined): mode is ShadeMode {
  return SHADE_MODES.some((item) => item.value === mode);
}

function getShadeModeLabel(mode: ShadeMode): string {
  return SHADE_MODES.find((item) => item.value === mode)?.label ?? "Classic";
}

function formatShadeScale(result: TailwindShadesResult): string {
  return result.shades
    .map((shade) => `${result.colourName}-${shade.name}: ${shade.hex}`)
    .join("\n");
}

function formatCssVariables(result: TailwindShadesResult): string {
  return [
    ":root {",
    ...result.shades.map(
      (shade) => `  --${result.colourName}-${shade.name}: ${shade.hex};`,
    ),
    "}",
  ].join("\n");
}

function formatOklchCssVariables(result: TailwindShadesResult): string {
  return [
    ":root {",
    ...result.shades.map(
      (shade) =>
        `  --${result.colourName}-${shade.name}: ${shade.oklch ?? shade.hex};`,
    ),
    "}",
  ].join("\n");
}

function formatTailwindConfig(result: TailwindShadesResult): string {
  return [
    `${result.colourName}: {`,
    ...result.shades.map((shade) => `  ${shade.name}: '${shade.hex}',`),
    "}",
  ].join("\n");
}
