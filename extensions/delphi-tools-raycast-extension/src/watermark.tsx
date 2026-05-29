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
import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { DelphitoolsRequired } from "./delphitools-install";

type FormValues = {
  images: string[];
  mark: string[];
  position: string;
  opacity: string;
  scale: string;
};

type WatermarkOutput = {
  path: string;
  size: number;
};

type WatermarkResult = {
  outputDirectory: string;
  outputs: WatermarkOutput[];
  outputPaths: string[];
};

const OUTPUT_NAMESPACE = "watermark";
const DEFAULT_POSITION = "bottom-right";
const DEFAULT_OPACITY = "0.3";
const DEFAULT_SCALE = "0.2";

const POSITIONS = [
  { label: "Bottom Right", value: "bottom-right" },
  { label: "Bottom", value: "bottom" },
  { label: "Bottom Left", value: "bottom-left" },
  { label: "Right", value: "right" },
  { label: "Center", value: "center" },
  { label: "Left", value: "left" },
  { label: "Top Right", value: "top-right" },
  { label: "Top", value: "top" },
  { label: "Top Left", value: "top-left" },
];

export default function Command() {
  return (
    <DelphitoolsRequired>
      {({ isCheckingInstall }) => (
        <WatermarkForm isCheckingInstall={isCheckingInstall} />
      )}
    </DelphitoolsRequired>
  );
}

function WatermarkForm({ isCheckingInstall }: { isCheckingInstall: boolean }) {
  const { push } = useNavigation();

  return (
    <Form
      isLoading={isCheckingInstall}
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues>
            icon={Icon.Image}
            title="Apply Watermark"
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
                await showToast({
                  style: Toast.Style.Animated,
                  title: "Applying watermark to images...",
                });

                const result = await runWatermark(values);

                await showToast({
                  style: Toast.Style.Success,
                  title: "Watermark applied",
                  message: `${result.outputs.length} image${
                    result.outputs.length === 1 ? "" : "s"
                  } processed.`,
                });

                push(<WatermarkResults result={result} />);
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : String(error);

                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not apply watermark",
                  message,
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="images"
        title="Images"
        allowMultipleSelection
        canChooseDirectories={false}
      />
      <Form.FilePicker
        id="mark"
        title="Watermark"
        allowMultipleSelection={false}
        canChooseDirectories={false}
      />
      <Form.Dropdown
        id="position"
        title="Position"
        defaultValue={DEFAULT_POSITION}
      >
        {POSITIONS.map((pos) => (
          <Form.Dropdown.Item
            key={pos.value}
            title={pos.label}
            value={pos.value}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="opacity"
        title="Opacity"
        defaultValue={DEFAULT_OPACITY}
        placeholder="0.0 to 1.0"
      />
      <Form.TextField
        id="scale"
        title="Scale"
        defaultValue={DEFAULT_SCALE}
        placeholder="0.0 to 1.0"
      />
      <Form.Description text="You can select multiple images. Watermarking is done locally and safely." />
    </Form>
  );
}

function WatermarkResults({ result }: { result: WatermarkResult }) {
  const allPaths = result.outputPaths.join("\n");

  return (
    <List searchBarPlaceholder="Search watermarked images">
      {result.outputs.map((output) => (
        <List.Item
          key={output.path}
          icon={{ source: output.path }}
          title={path.basename(output.path)}
          subtitle={path.dirname(output.path)}
          accessories={[{ text: formatFileSize(output.size) }]}
          actions={
            <WatermarkActions
              outputPath={output.path}
              allPaths={allPaths}
              outputDirectory={result.outputDirectory}
            />
          }
        />
      ))}
    </List>
  );
}

function WatermarkActions({
  outputPath,
  allPaths,
  outputDirectory,
}: {
  outputPath: string;
  allPaths: string;
  outputDirectory: string;
}) {
  async function copyImage() {
    await Clipboard.copy({ file: outputPath });
    await showToast({
      style: Toast.Style.Success,
      title: "Copied Watermarked Image",
    });
  }

  async function copyAllPaths() {
    await Clipboard.copy(allPaths);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied All Output Paths",
    });
  }

  return (
    <ActionPanel>
      <Action.Open
        icon={Icon.Eye}
        title="Open Watermarked Image"
        target={outputPath}
      />
      <Action
        icon={Icon.Clipboard}
        title="Copy Watermarked Image"
        onAction={copyImage}
      />
      <Action.CopyToClipboard
        title="Copy Image Path"
        content={outputPath}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
      <Action
        icon={Icon.Clipboard}
        title="Copy All Output Paths"
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        onAction={copyAllPaths}
      />
      <Action.ShowInFinder
        title="Reveal Output Folder"
        path={outputDirectory}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      />
      <Action.ShowInFinder
        title="Reveal in Finder"
        path={outputPath}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
    </ActionPanel>
  );
}

async function runWatermark(values: FormValues): Promise<WatermarkResult> {
  const outputRoot = getDefaultOutputRoot();
  await mkdir(outputRoot, { recursive: true });

  const hash = Math.random().toString(36).slice(2, 10);
  const outputDirectory = path.join(
    outputRoot,
    OUTPUT_NAMESPACE,
    `${Date.now()}-${hash}`,
  );
  await mkdir(outputDirectory, { recursive: true });

  const args = [
    "watermark",
    "--mark",
    values.mark[0],
    "--quiet",
    "--output",
    outputDirectory,
    ...values.images,
  ];

  const position = values.position;
  if (position) {
    args.push("--position", position);
  }

  const opacity = values.opacity.trim();
  if (opacity) {
    args.push("--opacity", opacity);
  }

  const scale = values.scale.trim();
  if (scale) {
    args.push("--scale", scale);
  }

  await execFileAsync(getDelphitoolsCliPath(), args);

  const outputs = await getOutputFiles(outputDirectory);

  if (outputs.length === 0) {
    throw new Error("No watermarked images were generated.");
  }

  return {
    outputDirectory,
    outputs,
    outputPaths: outputs.map((out) => out.path),
  };
}

async function getOutputFiles(
  outputDirectory: string,
): Promise<WatermarkOutput[]> {
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
    .filter((file): file is WatermarkOutput => file !== null)
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

  if (!values.mark?.length) {
    return { title: "Choose a watermark image" };
  }

  const opacityStr = values.opacity.trim();
  if (!opacityStr) {
    return { title: "Opacity is required" };
  }
  const opacity = Number(opacityStr);
  if (isNaN(opacity) || opacity < 0.0 || opacity > 1.0) {
    return {
      title: "Opacity must be between 0.0 and 1.0",
      message: "Enter a number between 0.0 and 1.0.",
    };
  }

  const scaleStr = values.scale.trim();
  if (!scaleStr) {
    return { title: "Scale is required" };
  }
  const scale = Number(scaleStr);
  if (isNaN(scale) || scale < 0.0 || scale > 1.0) {
    return {
      title: "Scale must be between 0.0 and 1.0",
      message: "Enter a number between 0.0 and 1.0.",
    };
  }

  return null;
}
