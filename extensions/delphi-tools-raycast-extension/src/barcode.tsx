import { execFileAsync, getDelphitoolsCliPath } from "./utils/exec";
import { getDefaultOutputRoot } from "./utils/preferences";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Grid,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { useEffect, useState } from "react";

import { DelphitoolsRequired } from "./delphitools-install";

type BarcodeFormat =
  | "ean13"
  | "ean8"
  | "upca"
  | "code39"
  | "code128"
  | "codabar"
  | "code93"
  | "itf";

type FormValues = {
  data: string;
  format: BarcodeFormat;
  height: string;
  scale: string;
};

type BarcodeResult = {
  data: string;
  format: BarcodeFormat;
  height: number;
  outputPath: string;
  scale: number;
};

type BarcodeFormatOption = {
  description: string;
  label: string;
  previewData: string;
  value: BarcodeFormat;
};

const DEFAULT_FORMAT: BarcodeFormat = "code128";
const DEFAULT_HEIGHT = "120";
const DEFAULT_SCALE = "2";
const OUTPUT_NAMESPACE = "barcode";
const PREVIEW_IMAGE_WIDTH = 420;
const FORMAT_PREVIEW_VERSION = "v3";

const BARCODE_FORMATS: BarcodeFormatOption[] = [
  {
    label: "EAN-13",
    value: "ean13",
    description: "13-digit retail barcode",
    previewData: "123456789101",
  },
  {
    label: "EAN-8",
    value: "ean8",
    description: "8-digit retail barcode",
    previewData: "1234567",
  },
  {
    label: "UPC-A",
    value: "upca",
    description: "12-digit retail barcode",
    previewData: "12345678910",
  },
  {
    label: "Code 39",
    value: "code39",
    description: "Uppercase letters, numbers, and symbols",
    previewData: "RAYCAST",
  },
  {
    label: "Code 128",
    value: "code128",
    description: "General-purpose text and numeric data",
    previewData: "Raycast",
  },
  {
    label: "Codabar",
    value: "codabar",
    description: "Numeric data with a small symbol set",
    previewData: "A123456A",
  },
  {
    label: "Code 93",
    value: "code93",
    description: "Compact alphanumeric barcode",
    previewData: "RAYCAST",
  },
  {
    label: "ITF",
    value: "itf",
    description: "Even-length numeric data",
    previewData: "12345678",
  },
];

export default function Command() {
  return (
    <DelphitoolsRequired>
      {({ isCheckingInstall }) => (
        <BarcodeForm isCheckingInstall={isCheckingInstall} />
      )}
    </DelphitoolsRequired>
  );
}

function BarcodeForm({ isCheckingInstall }: { isCheckingInstall: boolean }) {
  const { push } = useNavigation();
  const [format, setFormat] = useState<BarcodeFormat>(DEFAULT_FORMAT);
  const [formatPreviewPaths, setFormatPreviewPaths] =
    useState<Record<BarcodeFormat, string>>();

  useEffect(() => {
    async function loadFormatPreviews() {
      setFormatPreviewPaths(await writeFormatPreviewImages());
    }

    loadFormatPreviews();
  }, []);

  async function handleSubmit(values: FormValues) {
    const data = values.data.trim();

    if (!data) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter barcode data",
      });
      return;
    }

    const height = parsePositiveInteger(values.height, "Height");
    const scale = parsePositiveInteger(values.scale, "Scale");

    if (height instanceof Error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid barcode settings",
        message: height.message,
      });
      return;
    }

    if (scale instanceof Error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid barcode settings",
        message: scale.message,
      });
      return;
    }

    const dataValidation = validateBarcodeData(data, values.format);

    if (dataValidation instanceof Error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Invalid ${getFormatLabel(values.format)} data`,
        message: dataValidation.message,
      });
      return;
    }

    try {
      const result = await generateBarcode({
        data,
        format: values.format,
        height,
        scale,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Barcode ready",
      });

      push(<BarcodeDetail result={result} />);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Could not generate barcode",
        message,
      });
    }
  }

  return (
    <Form
      isLoading={isCheckingInstall}
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues>
            icon={Icon.BarCode}
            title="Generate Barcode"
            onSubmit={handleSubmit}
          />
          {formatPreviewPaths ? (
            <Action.Push
              icon={Icon.Eye}
              title="Show Supported Formats"
              target={
                <FormatPreviewGrid
                  previewPaths={formatPreviewPaths}
                  onSelectFormat={setFormat}
                />
              }
            />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.TextArea id="data" title="Data" placeholder="Data to encode" />
      <Form.Dropdown
        id="format"
        title="Format"
        value={format}
        onChange={(value) => setFormat(value as BarcodeFormat)}
      >
        {BARCODE_FORMATS.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            title={option.label}
            value={option.value}
          />
        ))}
      </Form.Dropdown>
      <Form.Description
        title=""
        text="Use Show Supported Formats to preview all barcode formats."
      />
      <Form.TextField
        id="height"
        title="Height"
        defaultValue={DEFAULT_HEIGHT}
      />
      <Form.TextField id="scale" title="Scale" defaultValue={DEFAULT_SCALE} />
    </Form>
  );
}

function FormatPreviewGrid({
  onSelectFormat,
  previewPaths,
}: {
  onSelectFormat: (format: BarcodeFormat) => void;
  previewPaths: Record<BarcodeFormat, string>;
}) {
  const { pop } = useNavigation();

  return (
    <Grid
      aspectRatio="16/9"
      columns={2}
      fit={Grid.Fit.Contain}
      inset={Grid.Inset.Medium}
      searchBarPlaceholder="Search supported barcode formats"
    >
      {BARCODE_FORMATS.map((format) => (
        <Grid.Item
          key={format.value}
          content={previewPaths[format.value]}
          keywords={[format.value, format.description]}
          title={format.label}
          subtitle={`${format.description} · ${format.previewData}`}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.CheckCircle}
                title="Use Format"
                onAction={() => {
                  onSelectFormat(format.value);
                  pop();
                }}
              />
              <Action.CopyToClipboard
                title="Copy CLI Value"
                content={format.value}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}

function BarcodeDetail({ result }: { result: BarcodeResult }) {
  async function copyImage() {
    await Clipboard.copy({ file: result.outputPath });
    await showToast({
      style: Toast.Style.Success,
      title: "Copied Barcode Image",
    });
  }

  return (
    <Detail
      markdown={getDetailMarkdown(result)}
      actions={
        <ActionPanel>
          <Action.Open
            icon={Icon.BarCode}
            title="Open Barcode Image"
            target={result.outputPath}
          />
          <Action
            icon={Icon.Clipboard}
            title="Copy Barcode Image"
            onAction={copyImage}
          />
          <Action.CopyToClipboard
            title="Copy Barcode Image Path"
            content={result.outputPath}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Barcode Data"
            content={result.data}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Format"
            text={getFormatLabel(result.format)}
          />
          <Detail.Metadata.Label title="Height" text={`${result.height}px`} />
          <Detail.Metadata.Label title="Scale" text={`${result.scale}px`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Path" text={result.outputPath} />
        </Detail.Metadata>
      }
    />
  );
}

async function generateBarcode({
  data,
  format,
  height,
  scale,
}: {
  data: string;
  format: BarcodeFormat;
  height: number;
  scale: number;
}): Promise<BarcodeResult> {
  const outputPath = getOutputPath({ data, format, height, scale });

  await mkdir(dirname(outputPath), { recursive: true });
  await execFileAsync(getDelphitoolsCliPath(), [
    "barcode",
    "--quiet",
    "--format",
    format,
    "--height",
    String(height),
    "--scale",
    String(scale),
    "--output",
    outputPath,
    data,
  ]);

  return {
    data,
    format,
    height,
    outputPath,
    scale,
  };
}

function getOutputPath({
  data,
  format,
  height,
  scale,
}: {
  data: string;
  format: BarcodeFormat;
  height: number;
  scale: number;
}): string {
  const hash = createHash("sha256")
    .update(JSON.stringify({ data, format, height, scale }))
    .digest("hex")
    .slice(0, 16);

  return join(
    getDefaultOutputRoot(),
    OUTPUT_NAMESPACE,
    `${format}-${height}-${scale}-${hash}.png`,
  );
}

function parsePositiveInteger(value: string, label: string): number | Error {
  const parsed = Number(value.trim());

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return new Error(`${label} must be a positive whole number.`);
  }

  return parsed;
}

function validateBarcodeData(
  data: string,
  format: BarcodeFormat,
): true | Error {
  switch (format) {
    case "ean13":
      return /^\d{12}$/.test(data)
        ? true
        : new Error("EAN-13 requires exactly 12 digits. Example: 123456789101");
    case "ean8":
      return /^\d{7}$/.test(data)
        ? true
        : new Error("EAN-8 requires exactly 7 digits. Example: 1234567");
    case "upca":
      return /^\d{11}$/.test(data)
        ? true
        : new Error("UPC-A requires exactly 11 digits. Example: 12345678910");
    case "code39":
      return /^[A-Z0-9 \-.$/+%]+$/.test(data)
        ? true
        : new Error(
            "Code 39 accepts uppercase letters, numbers, spaces, and - . $ / + %. Example: RAYCAST",
          );
    case "codabar":
      return /^[ABCD][0-9\-$:/.+]+[ABCD]$/.test(data)
        ? true
        : new Error(
            "Codabar must start and end with A, B, C, or D, with numbers and - $ : / . + between. Example: A123456A",
          );
    case "itf":
      return /^\d+$/.test(data) && data.length % 2 === 0
        ? true
        : new Error("ITF requires an even number of digits. Example: 12345678");
    case "code93":
    case "code128":
      return true;
  }
}

function getFormatLabel(format: BarcodeFormat): string {
  return (
    BARCODE_FORMATS.find((option) => option.value === format)?.label ?? format
  );
}

function getDetailMarkdown(result: BarcodeResult): string {
  return [
    `# ${getFormatLabel(result.format)}`,
    "",
    `<img src="${result.outputPath}" width="${PREVIEW_IMAGE_WIDTH}" />`,
    "",
    "## Data",
    "",
    "```text",
    result.data,
    "```",
  ].join("\n");
}

async function writeFormatPreviewImages(): Promise<
  Record<BarcodeFormat, string>
> {
  const entries = await Promise.all(
    BARCODE_FORMATS.map(async (format) => {
      const outputPath = getFormatPreviewPath(format);

      await mkdir(dirname(outputPath), { recursive: true });
      await execFileAsync(getDelphitoolsCliPath(), [
        "barcode",
        "--quiet",
        "--format",
        format.value,
        "--height",
        "120",
        "--scale",
        "2",
        "--output",
        outputPath,
        format.previewData,
      ]);

      return [format.value, outputPath] as const;
    }),
  );

  return Object.fromEntries(entries) as Record<BarcodeFormat, string>;
}

function getFormatPreviewPath(format: BarcodeFormatOption): string {
  return join(
    getDefaultOutputRoot(),
    OUTPUT_NAMESPACE,
    "format-previews",
    `${format.value}-${format.previewData.toLowerCase()}-${FORMAT_PREVIEW_VERSION}.png`,
  );
}
