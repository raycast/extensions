import { execFileAsync, getDelphitoolsCliPath } from "./utils/exec";
import { getDefaultOutputRoot } from "./utils/preferences";
import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { mkdir, mkdtemp, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { useState } from "react";

import { DelphitoolsRequired } from "./delphitools-install";

type TargetFormat =
  | "png"
  | "jpeg"
  | "jpg"
  | "webp"
  | "gif"
  | "tiff"
  | "bmp"
  | "ico";

type FormValues = {
  images: string[];
  to: TargetFormat;
  quality: string;
  resize: string;
};

type ConvertResult = {
  outputDirectory: string;
  outputs: ConvertOutput[];
  format: TargetFormat;
};

type ConvertOutput = {
  path: string;
  size: number;
};

const DEFAULT_QUALITY = "85";
const OUTPUT_NAMESPACE = "convert";
const RESIZE_PATTERN = /^((\d+x\d+)|(\d+x)|(x\d+)|([1-9]\d{0,2}%))$/i;

const TARGET_FORMATS: Array<{ label: string; value: TargetFormat }> = [
  { label: "PNG", value: "png" },
  { label: "JPEG", value: "jpeg" },
  { label: "JPG", value: "jpg" },
  { label: "WebP", value: "webp" },
  { label: "GIF", value: "gif" },
  { label: "TIFF", value: "tiff" },
  { label: "BMP", value: "bmp" },
  { label: "ICO", value: "ico" },
];

export default function Command() {
  return (
    <DelphitoolsRequired>
      {({ isCheckingInstall }) => (
        <ConvertForm isCheckingInstall={isCheckingInstall} />
      )}
    </DelphitoolsRequired>
  );
}

function ConvertForm({ isCheckingInstall }: { isCheckingInstall: boolean }) {
  const { push } = useNavigation();
  const [selectedFormat, setSelectedFormat] = useState<TargetFormat>("png");

  return (
    <Form
      isLoading={isCheckingInstall}
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues>
            icon={Icon.ArrowClockwise}
            title="Convert Images"
            onSubmit={async (values) => {
              const validationError = validateFormValues(values);

              if (validationError) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: validationError.title,
                  message: validationError.message,
                });
                return;
              }

              try {
                const result = await runConvert(values);

                await showToast({
                  style: Toast.Style.Success,
                  title: "Images converted",
                  message: `${result.outputs.length} output file${
                    result.outputs.length === 1 ? "" : "s"
                  } ready.`,
                });

                push(<ConvertResultsList result={result} />);
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : String(error);

                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not convert images",
                  message,
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="You can select multiple images." />
      <Form.FilePicker
        id="images"
        title="Images"
        allowMultipleSelection
        canChooseDirectories={false}
      />
      <Form.Dropdown
        id="to"
        title="Target Format"
        value={selectedFormat}
        onChange={(value) => setSelectedFormat(value as TargetFormat)}
      >
        {TARGET_FORMATS.map((format) => (
          <Form.Dropdown.Item
            key={format.value}
            title={format.label}
            value={format.value}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="quality"
        title="Quality"
        defaultValue={DEFAULT_QUALITY}
      />
      <Form.TextField
        id="resize"
        title="Resize"
        placeholder="800x600, 800x, x600, or 50%"
      />
    </Form>
  );
}

function ConvertResultsList({ result }: { result: ConvertResult }) {
  const outputPaths = result.outputs.map((output) => output.path).join("\n");

  return (
    <List searchBarPlaceholder="Search converted images">
      {result.outputs.map((output) => (
        <List.Item
          key={output.path}
          icon={{ source: output.path }}
          title={path.basename(output.path)}
          subtitle={path.dirname(output.path)}
          accessories={[
            { text: formatFileSize(output.size) },
            { text: result.format.toUpperCase() },
          ]}
          actions={
            <ActionPanel>
              <Action.Open
                icon={Icon.Eye}
                title="Open Converted Image"
                target={output.path}
              />
              <Action
                icon={Icon.Clipboard}
                title="Copy Converted Image"
                onAction={async () => {
                  await Clipboard.copy({ file: output.path });
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Copied Converted Image",
                  });
                }}
              />
              <Action.CopyToClipboard
                title="Copy Converted Image Path"
                content={output.path}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy All Output Paths"
                content={outputPaths}
                shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              />
              <Action.ShowInFinder
                title="Reveal Output Folder"
                path={result.outputDirectory}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              />
              <Action.ShowInFinder
                title="Reveal in Finder"
                path={output.path}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function runConvert(values: FormValues): Promise<ConvertResult> {
  const outputRoot = getDefaultOutputRoot();
  await mkdir(outputRoot, { recursive: true });

  const outputDirectory = await mkdtemp(
    path.join(outputRoot, `${OUTPUT_NAMESPACE}-`),
  );
  const args = [
    "convert",
    "--quiet",
    "--to",
    values.to,
    "--quality",
    values.quality.trim(),
    "--output",
    outputDirectory,
  ];
  const resize = values.resize.trim();

  if (resize) {
    args.push("--resize", resize);
  }

  args.push(...values.images);

  await execFileAsync(getDelphitoolsCliPath(), args);

  const outputs = await getOutputFiles(outputDirectory);

  if (outputs.length === 0) {
    throw new Error("No converted files were generated.");
  }

  return {
    outputDirectory,
    outputs,
    format: values.to,
  };
}

async function getOutputFiles(
  outputDirectory: string,
): Promise<ConvertOutput[]> {
  const entries = await readdir(outputDirectory);
  const files = await Promise.all(
    entries.map(async (entry) => {
      const outputPath = path.join(outputDirectory, entry);
      const outputStat = await stat(outputPath);

      return outputStat.isFile()
        ? { path: outputPath, size: outputStat.size }
        : null;
    }),
  );

  return files
    .filter((file): file is ConvertOutput => file !== null)
    .sort((a, b) => a.path.localeCompare(b.path));
}

function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  if (unitIndex === 0) {
    return `${bytes} B`;
  }

  return `${size >= 10 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
}

function validateFormValues(values: FormValues): {
  title: string;
  message?: string;
} | null {
  if (!values.images?.length) {
    return { title: "Choose at least one image" };
  }

  if (!values.to) {
    return { title: "Choose a target format" };
  }

  const quality = Number(values.quality.trim());

  if (!Number.isInteger(quality) || quality < 1 || quality > 100) {
    return {
      title: "Quality must be 1-100",
      message: "Enter a whole number between 1 and 100.",
    };
  }

  const resize = values.resize.trim();

  if (resize && !RESIZE_PATTERN.test(resize)) {
    return {
      title: "Resize must be WxH, Wx, xH, or P%",
      message: "Examples: 800x600, 800x, x600, or 50%.",
    };
  }

  return null;
}
