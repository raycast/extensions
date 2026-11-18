import { execFileAsync, getDelphitoolsCliPath } from "./utils/exec";
import { getDefaultOutputRoot } from "./utils/preferences";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { useEffect, useState } from "react";

import { DelphitoolsRequired } from "./delphitools-install";

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

type FormValues = {
  image: string[];
  type: ColorBlindnessType;
};

type SimulationResult = {
  inputPath: string;
  outputPath: string;
  type: ColorBlindnessType;
};

const DEFAULT_TYPE: ColorBlindnessType = "deuteranopia";
const OUTPUT_NAMESPACE = "colorblind-image";
const PREVIEW_IMAGE_WIDTH = 350;
const ALLOWED_IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".bmp",
  ".tif",
  ".tiff",
]);
const ALLOWED_IMAGE_TYPES_LABEL = "PNG, JPEG, WebP, GIF, BMP, or TIFF";

const COLOR_BLINDNESS_TYPES: Array<{
  label: string;
  value: ColorBlindnessType;
}> = [
  { label: "Normal Vision", value: "normal" },
  { label: "Protanopia", value: "protanopia" },
  { label: "Deuteranopia", value: "deuteranopia" },
  { label: "Tritanopia", value: "tritanopia" },
  { label: "Protanomaly", value: "protanomaly" },
  { label: "Deuteranomaly", value: "deuteranomaly" },
  { label: "Tritanomaly", value: "tritanomaly" },
  { label: "Achromatopsia", value: "achromatopsia" },
  { label: "Achromatomaly", value: "achromatomaly" },
];

export default function Command() {
  return (
    <DelphitoolsRequired>
      {({ isCheckingInstall }) => (
        <SimulationForm isCheckingInstall={isCheckingInstall} />
      )}
    </DelphitoolsRequired>
  );
}

function SimulationForm({ isCheckingInstall }: { isCheckingInstall: boolean }) {
  const { push } = useNavigation();
  const [selectedType, setSelectedType] =
    useState<ColorBlindnessType>(DEFAULT_TYPE);

  return (
    <Form
      isLoading={isCheckingInstall}
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues>
            icon={Icon.Eye}
            title="Simulate Color Blindness"
            onSubmit={async (values) => {
              const imagePath = values.image[0];

              if (!imagePath) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Choose an image",
                });
                return;
              }

              if (!isAllowedImagePath(imagePath)) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Unsupported image type",
                  message: `Choose a ${ALLOWED_IMAGE_TYPES_LABEL} image.`,
                });
                return;
              }

              try {
                const result = await runImageSimulation({
                  inputPath: imagePath,
                  type: values.type,
                });

                await showToast({
                  style: Toast.Style.Success,
                  title: "Simulation ready",
                });

                push(<SimulationDetail result={result} />);
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : String(error);

                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not simulate color blindness",
                  message,
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="image"
        title="Image"
        allowMultipleSelection={false}
        canChooseDirectories={false}
      />
      <Form.Dropdown
        id="type"
        title="Simulation"
        value={selectedType}
        onChange={(value) => setSelectedType(value as ColorBlindnessType)}
      >
        {COLOR_BLINDNESS_TYPES.map((type) => (
          <Form.Dropdown.Item
            key={type.value}
            title={type.label}
            value={type.value}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function SimulationDetail({ result }: { result: SimulationResult }) {
  async function copyImage() {
    await Clipboard.copy({ file: result.outputPath });
    await showToast({
      style: Toast.Style.Success,
      title: "Copied Simulated Image",
    });
  }

  return (
    <Detail
      markdown={getDetailMarkdown(result)}
      actions={
        <ActionPanel>
          <Action.Open
            icon={Icon.Eye}
            title="Open Simulated Image"
            target={result.outputPath}
          />
          <Action
            icon={Icon.Clipboard}
            title="Copy Simulated Image"
            onAction={copyImage}
          />
          <Action.CopyToClipboard
            icon={Icon.Clipboard}
            title="Copy Simulated Image Path"
            content={result.outputPath}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            icon={Icon.Clipboard}
            title="Copy Original Image Path"
            content={result.inputPath}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
          />
          <ActionPanel.Section title="Switch Mode">
            {COLOR_BLINDNESS_TYPES.filter(
              (type) => type.value !== result.type,
            ).map((type) => (
              <Action.Push
                key={type.value}
                icon={Icon.Eye}
                title={`Show ${type.label}`}
                target={
                  <SimulationResultView
                    inputPath={result.inputPath}
                    type={type.value}
                  />
                }
              />
            ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function SimulationResultView({
  inputPath,
  type,
}: {
  inputPath: string;
  type: ColorBlindnessType;
}) {
  const [result, setResult] = useState<SimulationResult>();
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadResult() {
      try {
        const nextResult = await runImageSimulation({ inputPath, type });

        if (!isMounted) {
          return;
        }

        setResult(nextResult);
        setError("");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (!isMounted) {
          return;
        }

        setResult(undefined);
        setError(message);
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not simulate color blindness",
          message,
        });
      }
    }

    loadResult();

    return () => {
      isMounted = false;
    };
  }, [inputPath, type]);

  if (result) {
    return <SimulationDetail result={result} />;
  }

  return (
    <Detail
      isLoading={!error}
      markdown={
        error
          ? ["# Could not simulate color blindness", "", error].join("\n")
          : "# Simulating color blindness..."
      }
    />
  );
}

async function runImageSimulation({
  inputPath,
  type,
}: {
  inputPath: string;
  type: ColorBlindnessType;
}): Promise<SimulationResult> {
  if (!isAllowedImagePath(inputPath)) {
    throw new Error(`Choose a ${ALLOWED_IMAGE_TYPES_LABEL} image.`);
  }

  const outputPath = getOutputPath(inputPath, type);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await execFileAsync(getDelphitoolsCliPath(), [
    "colorblind",
    "--quiet",
    "--cb-type",
    type,
    "--output",
    outputPath,
    inputPath,
  ]);

  return {
    inputPath,
    outputPath,
    type,
  };
}

function getOutputPath(inputPath: string, type: ColorBlindnessType): string {
  const extension = path.extname(inputPath).toLowerCase() || ".png";
  const hash = createHash("sha256")
    .update(`${inputPath}:${type}`)
    .digest("hex")
    .slice(0, 16);

  return path.join(
    getDefaultOutputRoot(),
    OUTPUT_NAMESPACE,
    `${path.basename(inputPath, extension)}-${type}-${hash}${extension}`,
  );
}

function isAllowedImagePath(imagePath: string): boolean {
  return ALLOWED_IMAGE_EXTENSIONS.has(path.extname(imagePath).toLowerCase());
}

function getColorBlindnessTypeLabel(type: ColorBlindnessType): string {
  return (
    COLOR_BLINDNESS_TYPES.find((item) => item.value === type)?.label ??
    "Deuteranopia"
  );
}

function getDetailMarkdown(result: SimulationResult): string {
  const simulationLabel = getColorBlindnessTypeLabel(result.type);

  return [
    `# ${simulationLabel}`,
    "",
    "<table>",
    "<tr>",
    "<th>Original</th>",
    `<th>${simulationLabel}</th>`,
    "</tr>",
    "<tr>",
    `<td><img src="${result.inputPath}" width="${PREVIEW_IMAGE_WIDTH}" /></td>`,
    `<td><img src="${result.outputPath}" width="${PREVIEW_IMAGE_WIDTH}" /></td>`,
    "</tr>",
    "</table>",
  ].join("\n");
}
