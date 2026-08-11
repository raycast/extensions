import { execFileAsync, getDelphitoolsCliPath } from "./utils/exec";
import { getDefaultOutputRoot } from "./utils/preferences";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  Keyboard,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import path from "node:path";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  DelphitoolsInstallStatusView,
  getDelphitoolsInstallStatus,
} from "./delphitools-install";
import { createTempSolidSwatchSvg } from "./swatch-png";

type PaletteColor = {
  hex: string;
  rgb: [number, number, number];
  oklch: [number, number, number];
};

type Strategy = {
  value: string;
  label: string;
  description: string;
};

type StrategyCategory = {
  label: string;
  strategies: Strategy[];
};

const STRATEGY_CATEGORIES: StrategyCategory[] = [
  {
    label: "Random",
    strategies: [
      {
        value: "random-cohesive",
        label: "Random Cohesive",
        description: "Random cohesive palette",
      },
      {
        value: "true-random",
        label: "True Random",
        description: "Completely random, no rules",
      },
    ],
  },
  {
    label: "Color Theory",
    strategies: [
      {
        value: "analogous",
        label: "Analogous",
        description: "Adjacent hues on the colour wheel",
      },
      {
        value: "complementary",
        label: "Complementary",
        description: "Opposite hues for high contrast",
      },
      {
        value: "triadic",
        label: "Triadic",
        description: "Three evenly spaced hues",
      },
      {
        value: "split-complementary",
        label: "Split-Complementary",
        description: "Base + two adjacent to complement",
      },
      {
        value: "tetradic",
        label: "Tetradic",
        description: "Four evenly spaced hues",
      },
      {
        value: "monochromatic",
        label: "Monochromatic",
        description: "Single hue, varied lightness",
      },
    ],
  },
  {
    label: "Moods",
    strategies: [
      {
        value: "thermos",
        label: "Thermos",
        description: "Warm, cozy, retro tones",
      },
      {
        value: "specimen",
        label: "Specimen",
        description: "Cool, clinical, preserved",
      },
      {
        value: "souvenir",
        label: "Souvenir",
        description: "Soft, faded pastels",
      },
      { value: "curfew", label: "Curfew", description: "Dark, moody depths" },
      {
        value: "telegraph",
        label: "Telegraph",
        description: "Muted vintage sepia",
      },
    ],
  },
  {
    label: "Decades & Eras",
    strategies: [
      {
        value: "70s",
        label: "70s",
        description: "Earth tones, burnt orange, avocado",
      },
      {
        value: "80s",
        label: "80s",
        description: "Neon pink, electric blue, hot purple",
      },
      {
        value: "90s",
        label: "90s",
        description: "Grunge, forest green, burgundy",
      },
      { value: "y2k", label: "Y2K", description: "Chrome, cyan, magenta" },
    ],
  },
  {
    label: "Nature & Scenes",
    strategies: [
      {
        value: "ocean-sunset",
        label: "Ocean Sunset",
        description: "Coral, rose, ocean blue, dusk",
      },
      {
        value: "forest-morning",
        label: "Forest Morning",
        description: "Fresh greens, mist, golden light",
      },
      {
        value: "desert-dusk",
        label: "Desert Dusk",
        description: "Terracotta, sand, dusty rose",
      },
      {
        value: "arctic",
        label: "Arctic",
        description: "Ice blue, white, pale cyan",
      },
      {
        value: "volcanic",
        label: "Volcanic",
        description: "Black, deep red, orange, ash",
      },
      {
        value: "meadow",
        label: "Meadow",
        description: "Grass green, wildflowers, sky blue",
      },
    ],
  },
  {
    label: "Art & Culture",
    strategies: [
      {
        value: "bauhaus",
        label: "Bauhaus",
        description: "Primary colors, geometric, bold",
      },
      {
        value: "art-deco",
        label: "Art Deco",
        description: "Gold, black, cream, emerald",
      },
      {
        value: "japanese",
        label: "Japanese",
        description: "Indigo, vermillion, gold, cream",
      },
      {
        value: "scandinavian",
        label: "Scandinavian",
        description: "White, pale grey, muted pastels",
      },
      {
        value: "mexican",
        label: "Mexican",
        description: "Hot pink, orange, turquoise, yellow",
      },
    ],
  },
];

const DEFAULT_STRATEGY = "random-cohesive";
const DEFAULT_SIZE = 5;

export default function Command() {
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
    <PaletteCommand isCheckingInstall={isDelphitoolsInstalled === undefined} />
  );
}

function PaletteCommand({ isCheckingInstall }: { isCheckingInstall: boolean }) {
  const [strategy, setStrategy] = useState<string>(DEFAULT_STRATEGY);
  const [size, setSize] = useState<number>(DEFAULT_SIZE);
  const [seed, setSeed] = useState<string>("");
  const [locks, setLocks] = useState<Record<number, string>>({});
  const [result, setResult] = useState<PaletteColor[]>();
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [swatchPaths, setSwatchPaths] = useState<string[]>([]);
  const { push } = useNavigation();

  const locksRef = useRef(locks);
  useEffect(() => {
    locksRef.current = locks;
  }, [locks]);

  const generate = useCallback(async () => {
    setIsProcessing(true);
    setError("");

    try {
      const colours = await runPaletteCli({
        strategy,
        size,
        seed,
        locks: locksRef.current,
      });

      setResult(colours);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setResult(undefined);
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not generate palette",
        message,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [strategy, size, seed]);

  useEffect(() => {
    if (!isCheckingInstall) {
      generate();
    }
  }, [isCheckingInstall, generate]);

  useEffect(() => {
    const currentResult = result;
    if (!currentResult) return;
    let isMounted = true;

    async function generateSwatches() {
      if (!currentResult) return;
      try {
        const paths = await Promise.all(
          currentResult.map((colour) =>
            createTempSolidSwatchSvg({
              colour: colour.hex,
              namespace: "palette",
            }),
          ),
        );
        if (isMounted) {
          setSwatchPaths(paths);
        }
      } catch (err) {
        console.error("Failed to generate swatches", err);
      }
    }

    generateSwatches();
    return () => {
      isMounted = false;
    };
  }, [result]);

  const handleIncreaseSize = () => {
    setSize((s) => Math.min(s + 1, 20));
  };

  const handleDecreaseSize = () => {
    if (size > 2) {
      const newSize = size - 1;
      setSize(newSize);
      setLocks((prev) => {
        const updated = { ...prev };
        delete updated[newSize];
        return updated;
      });
    }
  };

  const toggleLock = (index: number, hex: string) => {
    setLocks((prev) => {
      const updated = { ...prev };
      if (updated[index]) {
        delete updated[index];
      } else {
        updated[index] = hex;
      }
      return updated;
    });
  };

  const copyPaletteColors = async () => {
    if (!result) return;
    const coloursStr = result.map((c) => c.hex).join("\n");
    await Clipboard.copy(coloursStr);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied Palette Colors",
    });
  };

  const copyCssVariables = async () => {
    if (!result) return;
    const cssStr = result
      .map((colour, index) => `--palette-${index}: ${colour.hex};`)
      .join("\n");
    await Clipboard.copy(
      `:root {\n${cssStr
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n")}\n}`,
    );
    await showToast({
      style: Toast.Style.Success,
      title: "Copied CSS Variables",
    });
  };

  const copyJson = async () => {
    if (!result) return;
    const jsonStr = JSON.stringify(
      result.map((c) => c.hex),
      null,
      2,
    );
    await Clipboard.copy(jsonStr);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied JSON",
    });
  };

  const exportImage = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Exporting palette image...",
    });

    try {
      const outputPath = getTempPngPath();
      await exportPalettePng({
        strategy,
        size,
        seed,
        locks,
        outputPath,
      });

      await Clipboard.copy({ file: outputPath });

      toast.style = Toast.Style.Success;
      toast.title = "Palette Image Copied";
      toast.message = "Copied to clipboard as a PNG image file.";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to export image";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  };

  const promptForSeed = () => {
    push(
      <SeedForm
        initialSeed={seed}
        onSubmit={(newSeed) => {
          setSeed(newSeed);
        }}
      />,
    );
  };

  const getDetailMarkdown = () => {
    if (error) {
      return [`# Could not generate palette`, "", error].join("\n");
    }

    if (!result || swatchPaths.length !== result.length) {
      return `# Generating palette...\n\nStrategy: ${getStrategyLabel(strategy)}`;
    }

    const swatchesTable = [
      "| Slot | Swatch | Hex | Status |",
      "| :--- | :--- | :--- | :--- |",
      ...result.map((colour, index) => {
        const isLocked = !!locks[index];
        const status = isLocked ? "🔒 Locked" : "🔓 Open";
        return `| **Slot ${index}** | ![Slot ${index} swatch](${swatchPaths[index]}) | \`${colour.hex}\` | ${status} |`;
      }),
    ].join("\n");

    return [
      `# Generated Color Palette`,
      "",
      `Strategy: **${getStrategyLabel(strategy)}**`,
      "",
      swatchesTable,
    ].join("\n");
  };

  return (
    <Detail
      isLoading={isProcessing || isCheckingInstall}
      markdown={getDetailMarkdown()}
      actions={
        result ? (
          <ActionPanel>
            <Action
              icon={Icon.ArrowClockwise}
              title="Regenerate Palette"
              onAction={generate}
            />

            <ActionPanel.Submenu title="Choose Strategy" icon={Icon.Layers}>
              {STRATEGY_CATEGORIES.map((category) => (
                <ActionPanel.Section
                  key={category.label}
                  title={category.label}
                >
                  {category.strategies.map((strat) => (
                    <Action
                      key={strat.value}
                      title={strat.label}
                      onAction={() => setStrategy(strat.value)}
                    />
                  ))}
                </ActionPanel.Section>
              ))}
            </ActionPanel.Submenu>

            <ActionPanel.Section title="Palette Size">
              <Action
                icon={Icon.Plus}
                title="Increase Palette Size"
                shortcut={{ modifiers: ["cmd"], key: "+" }}
                onAction={handleIncreaseSize}
              />
              <Action
                icon={Icon.Minus}
                title="Decrease Palette Size"
                shortcut={{ modifiers: ["cmd"], key: "-" }}
                onAction={handleDecreaseSize}
              />
            </ActionPanel.Section>

            <ActionPanel.Section title="Lock/Unlock Slots">
              {result.map((colour, index) => {
                const isLocked = !!locks[index];
                return (
                  <Action
                    key={index}
                    icon={isLocked ? Icon.LockUnlocked : Icon.Lock}
                    title={
                      isLocked
                        ? `Unlock Slot ${index} (${colour.hex})`
                        : `Lock Slot ${index} (${colour.hex})`
                    }
                    onAction={() => toggleLock(index, colour.hex)}
                  />
                );
              })}
            </ActionPanel.Section>

            <ActionPanel.Section title="Export & Copy">
              <Action
                icon={Icon.Clipboard}
                title="Copy Palette Colors"
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                onAction={copyPaletteColors}
              />
              <Action
                icon={Icon.Code}
                title="Copy CSS Variables"
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                onAction={copyCssVariables}
              />
              <Action
                icon={Icon.Code}
                title="Copy JSON"
                shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
                onAction={copyJson}
              />
              <Action
                icon={Icon.Image}
                title="Export Palette Image"
                shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                onAction={exportImage}
              />
            </ActionPanel.Section>

            <ActionPanel.Section title="Copy Individual Colors">
              {result.map((colour, index) => (
                <Action.CopyToClipboard
                  key={index}
                  icon={{ source: Icon.Circle, tintColor: colour.hex }}
                  title={`Copy Slot ${index} (${colour.hex})`}
                  content={colour.hex}
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
            </ActionPanel.Section>

            <ActionPanel.Section title="Settings">
              <Action
                icon={Icon.Text}
                title="Set Seed…"
                onAction={promptForSeed}
              />
              {Object.keys(locks).length > 0 && (
                <Action.CopyToClipboard
                  title="Copy Lock String"
                  content={getLockString(locks)}
                />
              )}
            </ActionPanel.Section>
          </ActionPanel>
        ) : undefined
      }
      metadata={
        result ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Strategy"
              text={getStrategyLabel(strategy)}
            />
            <Detail.Metadata.Label title="Size" text={String(size)} />
            <Detail.Metadata.Label
              title="Seed"
              text={seed || "None (Random)"}
            />
            {Object.keys(locks).length > 0 && (
              <Detail.Metadata.Label
                title="Lock String"
                text={getLockString(locks)}
              />
            )}
            <Detail.Metadata.Separator />
            {result.map((colour, index) => (
              <Detail.Metadata.Label
                key={index}
                title={`Color ${index}`}
                text={colour.hex}
                icon={{
                  source: locks[index] ? Icon.Lock : Icon.Circle,
                  tintColor: colour.hex,
                }}
              />
            ))}
          </Detail.Metadata>
        ) : undefined
      }
    />
  );
}

function SeedForm({
  initialSeed,
  onSubmit,
}: {
  initialSeed: string;
  onSubmit: (seed: string) => void;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Set Seed"
            onSubmit={(values: { seed: string }) => {
              onSubmit(values.seed);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="seed"
        title="Seed"
        placeholder="Enter numeric seed (any 64-bit unsigned integer)"
        defaultValue={initialSeed}
      />
    </Form>
  );
}

async function runPaletteCli({
  strategy,
  size,
  seed,
  locks,
}: {
  strategy: string;
  size: number;
  seed?: string;
  locks?: Record<number, string>;
}): Promise<PaletteColor[]> {
  const args = ["palette", "--quiet", "--format", "json"];
  if (strategy && strategy !== "random-cohesive") {
    args.push("--strategy", strategy);
  }
  if (size) {
    args.push("--size", String(size));
  }
  if (seed && seed.trim()) {
    args.push("--seed", seed.trim());
  }
  if (locks && Object.keys(locks).length > 0) {
    const lockStr = getLockString(locks);
    args.push("--lock", lockStr);
  }

  const { stdout } = await execFileAsync(getDelphitoolsCliPath(), args);
  return JSON.parse(stdout) as PaletteColor[];
}

async function exportPalettePng({
  strategy,
  size,
  seed,
  locks,
  outputPath,
}: {
  strategy: string;
  size: number;
  seed?: string;
  locks?: Record<number, string>;
  outputPath: string;
}): Promise<void> {
  const args = [
    "palette",
    "--quiet",
    "--format",
    "png",
    "--output",
    outputPath,
  ];
  if (strategy && strategy !== "random-cohesive") {
    args.push("--strategy", strategy);
  }
  if (size) {
    args.push("--size", String(size));
  }
  if (seed && seed.trim()) {
    args.push("--seed", seed.trim());
  }
  if (locks && Object.keys(locks).length > 0) {
    const lockStr = getLockString(locks);
    args.push("--lock", lockStr);
  }

  await execFileAsync(getDelphitoolsCliPath(), args);
}

function getTempPngPath(): string {
  const uniqueId = Math.random().toString(36).substring(2, 10);
  return path.join(
    getDefaultOutputRoot(),
    "palette",
    `palette-export-${uniqueId}.png`,
  );
}

function getLockString(locks: Record<number, string>): string {
  return Object.entries(locks)
    .map(([idx, hex]) => `${idx}:${hex}`)
    .join(",");
}

function getStrategyLabel(stratValue: string): string {
  for (const category of STRATEGY_CATEGORIES) {
    const found = category.strategies.find((s) => s.value === stratValue);
    if (found) {
      return found.label;
    }
  }
  return stratValue;
}
