import type { LaunchProps } from "@raycast/api";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  getSelectedText,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";

import {
  DelphitoolsInstallStatusView,
  getDelphitoolsInstallStatus,
} from "./delphitools-install";
import { createTempTextSwatchSvg } from "./swatch-png";
import { getContrastRatio, hexToRgb, rgbToHex } from "./utils/color";
import { execFileAsync, getDelphitoolsCliPath } from "./utils/exec";
import { getCliDebounceDelay } from "./utils/preferences";

type FormValues = {
  fg: string;
  bg: string;
};

type ContrastResult = {
  aa_large: boolean;
  aa_normal: boolean;
  aaa_large: boolean;
  aaa_normal: boolean;
  bg: string;
  fg: string;
  ratio: number;
};

const DEFAULT_BG = "#1a1a2e";
const DEFAULT_FG = "#eaeaea";
const SWATCH_NAMESPACE = "contrast";

type ContrastPreview = {
  path: string;
};

export default function Command(
  props: LaunchProps<{ arguments: Arguments.Contrast }>,
) {
  return (
    <ContrastCommand
      initialFg={props.arguments.fg}
      initialBg={props.arguments.bg}
    />
  );
}

function ContrastCommand({
  initialFg = "",
  initialBg = "",
}: {
  initialFg?: string;
  initialBg?: string;
}) {
  const [isDelphitoolsInstalled, setIsDelphitoolsInstalled] =
    useState<boolean>();
  const [directResult, setDirectResult] = useState<ContrastResult>();
  const [directError, setDirectError] = useState("");
  const shouldOpenDirectly = Boolean(initialFg.trim() && initialBg.trim());

  useEffect(() => {
    async function checkInstallStatus() {
      const status = await getDelphitoolsInstallStatus();

      setIsDelphitoolsInstalled(status.installed);
    }

    checkInstallStatus();
  }, []);

  useEffect(() => {
    if (!shouldOpenDirectly || isDelphitoolsInstalled !== true) {
      return;
    }

    async function loadDirectResult() {
      try {
        const result = await runContrast(initialFg, initialBg);

        setDirectResult(result);
        setDirectError("");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        setDirectError(message);
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not check contrast",
          message,
        });
      }
    }

    loadDirectResult();
  }, [initialBg, initialFg, isDelphitoolsInstalled, shouldOpenDirectly]);

  if (isDelphitoolsInstalled === false) {
    return <DelphitoolsInstallStatusView status={{ installed: false }} />;
  }

  if (shouldOpenDirectly) {
    if (directResult) {
      return <ContrastDetail result={directResult} />;
    }

    if (directError) {
      return (
        <Detail
          markdown={`# Could not check contrast\n\n${directError}`}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Pencil}
                title="Edit Colors"
                target={
                  <ContrastForm initialFg={initialFg} initialBg={initialBg} />
                }
              />
            </ActionPanel>
          }
        />
      );
    }

    return <Detail isLoading markdown="# Checking contrast" />;
  }

  return <ContrastForm initialFg={initialFg} initialBg={initialBg} />;
}

function ContrastForm({
  initialFg,
  initialBg,
}: {
  initialFg: string;
  initialBg: string;
}) {
  const [values, setValues] = useState<FormValues>({
    fg: initialFg || DEFAULT_FG,
    bg: initialBg || DEFAULT_BG,
  });
  const [result, setResult] = useState<ContrastResult>();
  const [isProcessing, setIsProcessing] = useState(false);
  const lastToastErrorRef = useRef("");

  useEffect(() => {
    async function hydrateInitialColour() {
      const colour = await getInitialColour();

      if (!colour) {
        return;
      }

      setValues((currentValues) => {
        if (currentValues.fg) {
          return currentValues;
        }

        return {
          ...currentValues,
          fg: colour,
        };
      });
    }

    hydrateInitialColour();
  }, []);

  useEffect(() => {
    if (!values.fg.trim() || !values.bg.trim()) {
      setResult(undefined);
      lastToastErrorRef.current = "";
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);

    const timeout = setTimeout(async () => {
      try {
        const nextResult = await runContrast(values.fg, values.bg);

        setResult(nextResult);
        lastToastErrorRef.current = "";
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const toastErrorKey = `${values.fg}:${values.bg}:${message}`;

        if (lastToastErrorRef.current !== toastErrorKey) {
          lastToastErrorRef.current = toastErrorKey;
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not check contrast",
            message,
          });
        }
      } finally {
        setIsProcessing(false);
      }
    }, getCliDebounceDelay());

    return () => {
      clearTimeout(timeout);
    };
  }, [values.fg, values.bg]);

  async function copyResult() {
    if (!result) {
      return;
    }

    await Clipboard.copy(formatResult(result));
    await showToast({
      style: Toast.Style.Success,
      title: "Copied Contrast Result",
    });
  }

  function swapColours() {
    setValues((currentValues) => ({
      fg: currentValues.bg,
      bg: currentValues.fg,
    }));
  }

  function fixToMinimumRatio(minimumRatio: number) {
    if (!result) {
      return;
    }

    const fixedForeground = getForegroundForRatio(
      result.fg,
      result.bg,
      minimumRatio,
    );

    if (!fixedForeground) {
      showToast({
        style: Toast.Style.Failure,
        title: "Could not fix foreground",
      });
      return;
    }

    setValues((currentValues) => ({
      ...currentValues,
      fg: fixedForeground,
    }));
  }

  return (
    <Form
      isLoading={isProcessing}
      actions={
        <ActionPanel>
          {result ? (
            <Action.Push
              icon={Icon.Eye}
              title="Show Contrast Details"
              target={
                <ContrastDetail
                  result={result}
                  onResultChange={(nextResult) => {
                    setResult(nextResult);
                    setValues((currentValues) => ({
                      ...currentValues,
                      fg: nextResult.fg,
                      bg: nextResult.bg,
                    }));
                  }}
                />
              }
            />
          ) : null}
          <Action
            icon={Icon.Switch}
            title="Flip Colors"
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={swapColours}
          />
          <Action
            icon={Icon.Wand}
            title="Fix to AA"
            shortcut={{ modifiers: ["cmd", "opt"], key: "2" }}
            onAction={() => fixToMinimumRatio(4.5)}
          />
          <Action
            icon={Icon.Wand}
            title="Fix to AAA"
            shortcut={{ modifiers: ["cmd", "opt"], key: "3" }}
            onAction={() => fixToMinimumRatio(7)}
          />
          <Action
            icon={Icon.Clipboard}
            title="Copy Contrast Result"
            onAction={copyResult}
          />
          <Action.CopyToClipboard
            icon={Icon.Clipboard}
            title="Copy Foreground"
            content={values.fg}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <Action.CopyToClipboard
            icon={Icon.Clipboard}
            title="Copy Background"
            content={values.bg}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="bg"
        title="Background Color"
        placeholder="#1a1a2e, black, rgb(26 26 46), hsl(240 28% 14%)"
        value={values.bg}
        onChange={(bg) =>
          setValues((currentValues) => ({
            ...currentValues,
            bg,
          }))
        }
      />
      <Form.TextField
        id="fg"
        title="Foreground Color"
        placeholder="#eaeaea, white, rgb(234 234 234), hsl(0 0% 92%)"
        value={values.fg}
        onChange={(fg) =>
          setValues((currentValues) => ({
            ...currentValues,
            fg,
          }))
        }
      />
    </Form>
  );
}

function ContrastDetail({
  result,
  onResultChange,
}: {
  result: ContrastResult;
  onResultChange?: (result: ContrastResult) => void;
}) {
  const [displayResult, setDisplayResult] = useState(result);
  const [preview, setPreview] = useState<ContrastPreview>();
  const [previewError, setPreviewError] = useState("");
  const [isFixing, setIsFixing] = useState(false);

  useEffect(() => {
    setDisplayResult(result);
  }, [result]);

  useEffect(() => {
    let isMounted = true;

    setPreview(undefined);
    setPreviewError("");

    async function createPreview() {
      try {
        const path = await createTempTextSwatchSvg({
          backgroundColour: displayResult.bg,
          foregroundColour: displayResult.fg,
          namespace: SWATCH_NAMESPACE,
        });

        if (!isMounted) {
          return;
        }

        setPreview({ path });
        setPreviewError("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPreview(undefined);
        setPreviewError(error instanceof Error ? error.message : String(error));
      }
    }

    createPreview();

    return () => {
      isMounted = false;
    };
  }, [displayResult.bg, displayResult.fg]);

  async function copyResult() {
    await Clipboard.copy(formatResult(displayResult));
    await showToast({
      style: Toast.Style.Success,
      title: "Copied Contrast Result",
    });
  }

  async function swapColours() {
    setIsFixing(true);

    try {
      const nextResult = await runContrast(displayResult.bg, displayResult.fg);

      setDisplayResult(nextResult);
      onResultChange?.(nextResult);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not swap colors",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsFixing(false);
    }
  }

  async function fixToMinimumRatio(minimumRatio: number) {
    const fixedForeground = getForegroundForRatio(
      displayResult.fg,
      displayResult.bg,
      minimumRatio,
    );

    if (!fixedForeground) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not fix foreground",
      });
      return;
    }

    setIsFixing(true);

    try {
      const nextResult = await runContrast(fixedForeground, displayResult.bg);

      setDisplayResult(nextResult);
      onResultChange?.(nextResult);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not check fixed contrast",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsFixing(false);
    }
  }

  return (
    <Detail
      isLoading={isFixing || (!preview && !previewError)}
      markdown={getDetailMarkdown(displayResult, preview, previewError)}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Wand}
            title="Fix to AA"
            shortcut={{ modifiers: ["cmd", "opt"], key: "2" }}
            onAction={() => fixToMinimumRatio(4.5)}
          />
          <Action
            icon={Icon.Wand}
            title="Fix to AAA"
            shortcut={{ modifiers: ["cmd", "opt"], key: "3" }}
            onAction={() => fixToMinimumRatio(7)}
          />
          <Action
            icon={Icon.Clipboard}
            title="Copy Contrast Result"
            onAction={copyResult}
          />
          <Action.CopyToClipboard
            icon={Icon.Clipboard}
            title="Copy Foreground"
            content={displayResult.fg}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          {preview ? (
            <Action.CopyToClipboard
              icon={Icon.Clipboard}
              title="Copy Preview Path"
              content={preview.path}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          ) : null}
          <Action
            icon={Icon.Switch}
            title="Flip Colors"
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={swapColours}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Background Color"
            text={displayResult.bg}
            icon={{ source: Icon.Circle, tintColor: displayResult.bg }}
          />
          <Detail.Metadata.Label
            title="Foreground Color"
            text={displayResult.fg}
            icon={{ source: Icon.Circle, tintColor: displayResult.fg }}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Contrast Ratio"
            text={`${displayResult.ratio.toFixed(2)}:1`}
          />
          <Detail.Metadata.Label
            title="Rating"
            text={getRatioLabel(displayResult.ratio)}
          />
        </Detail.Metadata>
      }
    />
  );
}

async function getInitialColour(): Promise<string> {
  try {
    const selectedText = await getSelectedText();

    if (selectedText.trim()) {
      return selectedText.trim();
    }
  } catch {
    // Selection is optional; clipboard is the fallback source.
  }

  return ((await Clipboard.readText()) ?? "").trim();
}

async function runContrast(fg: string, bg: string): Promise<ContrastResult> {
  const { stdout } = await execFileAsync(getDelphitoolsCliPath(), [
    "contrast",
    "--json",
    fg,
    bg,
  ]);

  return JSON.parse(stdout) as ContrastResult;
}

function formatResult(result: ContrastResult): string {
  return [
    `Ratio: ${result.ratio.toFixed(2)}:1`,
    `Foreground: ${result.fg}`,
    `Background: ${result.bg}`,
    `AA normal: ${formatPass(result.aa_normal)}  large: ${formatPass(result.aa_large)}`,
    `AAA normal: ${formatPass(result.aaa_normal)}  large: ${formatPass(result.aaa_large)}`,
  ].join("\n");
}

function formatPass(value: boolean): string {
  return value ? "PASS" : "FAIL";
}

function getDetailMarkdown(
  result: ContrastResult,
  preview: ContrastPreview | undefined,
  previewError: string,
): string {
  const fixHintText = getFixHintText(result);
  const hintSection = fixHintText ? `\n## Hint\n${fixHintText}\n` : "";
  const previewSection = getPreviewMarkdown(preview, previewError);

  return [
    previewSection,
    `# ${result.ratio.toFixed(2)}:1`,
    `Contrast Ratio: ${getRatioLabel(result.ratio)}`,
    hintSection,
    "## WCAG 2.1 Compliance",
    "",
    "### Level AA",
    "",
    `- ${formatPass(result.aa_normal)} Normal Text (4.5:1)`,
    `- ${formatPass(result.aa_large)} Large Text (3:1)`,
    "",
    "### Level AAA",
    "",
    `- ${formatPass(result.aaa_normal)} Normal Text (7:1)`,
    `- ${formatPass(result.aaa_large)} Large Text (4.5:1)`,
    "",
    "## About WCAG AA",
    "",
    "- Normal: 4.5:1 minimum for text smaller than 18pt (or 14pt bold)",
    "- Large: 3:1 minimum for text 18pt+ (or 14pt+ bold)",
    "",
    "## About WCAG AAA",
    "",
    "- AAA Normal: 7:1 minimum for enhanced accessibility",
    "- AAA Large: 4.5:1 minimum for large text enhanced accessibility",
  ]
    .filter(Boolean)
    .join("\n");
}

function getPreviewMarkdown(
  preview: ContrastPreview | undefined,
  previewError: string,
): string {
  if (previewError) {
    return ["Could not generate contrast preview.", "", previewError, ""].join(
      "\n",
    );
  }

  if (!preview) {
    return ["Generating contrast preview...", ""].join("\n");
  }

  return [`![Contrast preview](${preview.path})`, ""].join("\n");
}

function getFixHintText(result: ContrastResult | undefined): string {
  if (!result) {
    return "";
  }

  const hints = [];

  if (!result.aa_normal || !result.aa_large) {
    hints.push(`Press ${formatShortcut("2")} to fix to AA.`);
  }

  if (!result.aaa_normal || !result.aaa_large) {
    hints.push(`Press ${formatShortcut("3")} to fix to AAA.`);
  }

  return hints.join("\n");
}

function formatShortcut(key: string): string {
  const superKey = process.platform === "win32" ? "⊞" : "⌘";
  const optionKey = process.platform === "win32" ? "Alt" : "⌥";

  return `${optionKey}${superKey}${key}`;
}

function getRatioLabel(ratio: number): string {
  if (ratio >= 7) {
    return "Excellent";
  }

  if (ratio >= 4.5) {
    return "Good";
  }

  if (ratio >= 3) {
    return "Large text only";
  }

  return "Insufficient";
}

function getForegroundForRatio(
  foreground: string,
  background: string,
  minimumRatio: number,
): string | undefined {
  const foregroundRgb = hexToRgb(foreground);
  const backgroundRgb = hexToRgb(background);

  if (!foregroundRgb || !backgroundRgb) {
    return undefined;
  }

  if (getContrastRatio(foregroundRgb, backgroundRgb) >= minimumRatio) {
    return foreground;
  }

  const black = [0, 0, 0] as const;
  const white = [255, 255, 255] as const;
  const blackRatio = getContrastRatio(black, backgroundRgb);
  const whiteRatio = getContrastRatio(white, backgroundRgb);
  const target = blackRatio > whiteRatio ? black : white;

  let best = [...foregroundRgb] as [number, number, number];

  for (let step = 1; step <= 100; step += 1) {
    const amount = step / 100;
    const next = foregroundRgb.map((channel, index) =>
      Math.round(channel + (target[index] - channel) * amount),
    ) as [number, number, number];

    best = next;

    if (getContrastRatio(next, backgroundRgb) >= minimumRatio) {
      break;
    }
  }

  return rgbToHex(best);
}
