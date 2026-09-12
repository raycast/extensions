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
import { useEffect, useState } from "react";

import {
  DelphitoolsInstallStatusView,
  getDelphitoolsInstallStatus,
} from "./delphitools-install";

type CropPosition =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

type FormValues = {
  images: string[];
  ratio: string;
  position: CropPosition;
};

type CropResult = {
  outputDirectory: string;
  outputs: CropOutput[];
  ratio: string;
  position: CropPosition;
};

type CropOutput = {
  path: string;
  size: number;
};

const DEFAULT_RATIO = "1:1";
const OUTPUT_NAMESPACE = "crop";
const RATIO_PATTERN =
  /^\s*(\d+(?:\.\d+)?|\.\d+)\s*:\s*(\d+(?:\.\d+)?|\.\d+)\s*$/;

const POSITIONS: Array<{ label: string; value: CropPosition }> = [
  { label: "Center", value: "center" },
  { label: "Top", value: "top" },
  { label: "Bottom", value: "bottom" },
  { label: "Left", value: "left" },
  { label: "Right", value: "right" },
  { label: "Top Left", value: "top-left" },
  { label: "Top Right", value: "top-right" },
  { label: "Bottom Left", value: "bottom-left" },
  { label: "Bottom Right", value: "bottom-right" },
];

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

  return <CropForm isCheckingInstall={isDelphitoolsInstalled === undefined} />;
}

function CropForm({ isCheckingInstall }: { isCheckingInstall: boolean }) {
  const { push } = useNavigation();
  const [position, setPosition] = useState<CropPosition>("center");

  return (
    <Form
      isLoading={isCheckingInstall}
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues>
            icon={Icon.Image}
            title="Social Media Cropper"
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
                const result = await runCrop(values);

                await showToast({
                  style: Toast.Style.Success,
                  title: "Images cropped",
                  message: `${result.outputs.length} output file${
                    result.outputs.length === 1 ? "" : "s"
                  } ready.`,
                });

                push(<CropResultsList result={result} />);
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : String(error);

                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not crop images",
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
      <Form.TextField
        id="ratio"
        title="Ratio"
        defaultValue={DEFAULT_RATIO}
        placeholder="1:1, 4:5, or 16:9"
      />
      <Form.Dropdown
        id="position"
        title="Position"
        value={position}
        onChange={(value) => setPosition(value as CropPosition)}
      >
        {POSITIONS.map((item) => (
          <Form.Dropdown.Item
            key={item.value}
            title={item.label}
            value={item.value}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function CropResultsList({ result }: { result: CropResult }) {
  const outputPaths = result.outputs.map((output) => output.path).join("\n");

  return (
    <List searchBarPlaceholder="Search cropped images">
      {result.outputs.map((output) => (
        <List.Item
          key={output.path}
          icon={{ source: output.path }}
          title={path.basename(output.path)}
          subtitle={path.dirname(output.path)}
          accessories={[
            { text: formatFileSize(output.size) },
            { text: result.ratio },
            { text: result.position },
          ]}
          actions={
            <ActionPanel>
              <Action.Open
                icon={Icon.Eye}
                title="Open Cropped Image"
                target={output.path}
              />
              <Action
                icon={Icon.Clipboard}
                title="Copy Cropped Image"
                onAction={async () => {
                  await Clipboard.copy({ file: output.path });
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Copied Cropped Image",
                  });
                }}
              />
              <Action.CopyToClipboard
                title="Copy Cropped Image Path"
                content={output.path}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy All Output Paths"
                content={outputPaths}
                shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              />
              <Action.ShowInFinder
                title="Reveal in Finder"
                path={output.path}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action.ShowInFinder
                title="Reveal Output Folder"
                path={result.outputDirectory}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function runCrop(values: FormValues): Promise<CropResult> {
  const outputRoot = getDefaultOutputRoot();
  await mkdir(outputRoot, { recursive: true });

  const outputDirectory = await mkdtemp(
    path.join(outputRoot, `${OUTPUT_NAMESPACE}-`),
  );
  const ratio = normalizeRatio(values.ratio);

  await execFileAsync(getDelphitoolsCliPath(), [
    "crop",
    "--quiet",
    "--ratio",
    ratio,
    "--position",
    values.position,
    "--output",
    outputDirectory,
    ...values.images,
  ]);

  const outputs = await getOutputFiles(outputDirectory);

  if (outputs.length === 0) {
    throw new Error("No cropped files were generated.");
  }

  return {
    outputDirectory,
    outputs,
    ratio,
    position: values.position,
  };
}

async function getOutputFiles(outputDirectory: string): Promise<CropOutput[]> {
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
    .filter((file): file is CropOutput => file !== null)
    .sort((a, b) => a.path.localeCompare(b.path));
}

function validateFormValues(values: FormValues): {
  title: string;
  message?: string;
} | null {
  if (!values.images?.length) {
    return { title: "Choose at least one image" };
  }

  if (!RATIO_PATTERN.test(values.ratio)) {
    return {
      title: "Ratio must be number:number",
      message: "Examples: 1:1, 4:5, or 16:9.",
    };
  }

  const [, width, height] = values.ratio.match(RATIO_PATTERN) ?? [];

  if (Number(width) <= 0 || Number(height) <= 0) {
    return {
      title: "Ratio values must be greater than zero",
      message: "Examples: 1:1, 4:5, or 16:9.",
    };
  }

  return null;
}

function normalizeRatio(ratio: string): string {
  return ratio.replace(/\s+/g, "");
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
