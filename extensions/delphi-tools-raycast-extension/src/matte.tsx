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

type MatteMode = "blur" | "solid" | "gradient";
type RatioPreset = "1:1" | "4:5" | "3:4" | "9:16" | "custom";

type FormValues = {
  images: string[];
  mode: MatteMode;
  ratioPreset: RatioPreset;
  customRatio: string;
  colour: string;
};

type MatteResult = {
  outputDirectory: string;
  outputs: MatteOutput[];
  mode: MatteMode;
  ratio: string;
};

type MatteOutput = {
  path: string;
  size: number;
};

const OUTPUT_NAMESPACE = "matte";
const DEFAULT_COLOUR = "#ffffff";
const RATIO_PATTERN = /^[1-9]\d{0,3}:[1-9]\d{0,3}$/;
const COLOUR_PATTERN =
  /^(#[0-9a-f]{3}([0-9a-f]{3})?|[a-z]+|rgb\(.+\)|hsl\(.+\))$/i;

const MODES: Array<{ label: string; value: MatteMode }> = [
  { label: "Blur", value: "blur" },
  { label: "Solid", value: "solid" },
  { label: "Gradient", value: "gradient" },
];

const RATIO_PRESETS: Array<{ label: string; value: RatioPreset }> = [
  { label: "Square (1:1)", value: "1:1" },
  { label: "Portrait (4:5)", value: "4:5" },
  { label: "Classic Portrait (3:4)", value: "3:4" },
  { label: "Story (9:16)", value: "9:16" },
  { label: "Custom", value: "custom" },
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

  return <MatteForm isCheckingInstall={isDelphitoolsInstalled === undefined} />;
}

function MatteForm({ isCheckingInstall }: { isCheckingInstall: boolean }) {
  const { push } = useNavigation();
  const [selectedMode, setSelectedMode] = useState<MatteMode>("blur");
  const [selectedRatio, setSelectedRatio] = useState<RatioPreset>("1:1");
  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <Form
      isLoading={isCheckingInstall || isGenerating}
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues>
            icon={Icon.Image}
            title={isGenerating ? "Generating Matte…" : "Generate Matte"}
            onSubmit={async (values) => {
              if (isGenerating) {
                return;
              }

              const validationError = validateFormValues(values);

              if (validationError) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: validationError.title,
                  message: validationError.message,
                });
                return;
              }

              setIsGenerating(true);

              try {
                await showToast({
                  style: Toast.Style.Animated,
                  title: "Generating matte",
                  message: "Processing selected image files...",
                });

                const result = await runMatte(values);

                await showToast({
                  style: Toast.Style.Success,
                  title: "Matte generated",
                  message: `${result.outputs.length} output file${
                    result.outputs.length === 1 ? "" : "s"
                  } ready.`,
                });

                push(<MatteResultsList result={result} />);
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : String(error);

                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not generate matte",
                  message,
                });
              } finally {
                setIsGenerating(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          isGenerating
            ? "Generating matted image files..."
            : "Place images on a square or portrait matte. You can select multiple images."
        }
      />
      <Form.FilePicker
        id="images"
        title="Images"
        allowMultipleSelection
        canChooseDirectories={false}
      />
      <Form.Dropdown
        id="mode"
        title="Style"
        value={selectedMode}
        onChange={(value) => setSelectedMode(value as MatteMode)}
      >
        {MODES.map((mode) => (
          <Form.Dropdown.Item
            key={mode.value}
            title={mode.label}
            value={mode.value}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="ratioPreset"
        title="Aspect Ratio"
        value={selectedRatio}
        onChange={(value) => setSelectedRatio(value as RatioPreset)}
      >
        {RATIO_PRESETS.map((ratio) => (
          <Form.Dropdown.Item
            key={ratio.value}
            title={ratio.label}
            value={ratio.value}
          />
        ))}
      </Form.Dropdown>
      {selectedRatio === "custom" ? (
        <Form.TextField
          id="customRatio"
          title="Custom Ratio"
          placeholder="2:3"
        />
      ) : null}
      {selectedMode === "solid" ? (
        <Form.TextField
          id="colour"
          title="Background Colour"
          defaultValue={DEFAULT_COLOUR}
          placeholder="#ffffff"
        />
      ) : null}
    </Form>
  );
}

function MatteResultsList({ result }: { result: MatteResult }) {
  const outputPaths = result.outputs.map((output) => output.path).join("\n");

  return (
    <List searchBarPlaceholder="Search matted images">
      {result.outputs.map((output) => (
        <List.Item
          key={output.path}
          icon={{ source: output.path }}
          title={path.basename(output.path)}
          subtitle={path.dirname(output.path)}
          accessories={[
            { text: formatFileSize(output.size) },
            { text: result.mode },
            { text: result.ratio },
          ]}
          actions={
            <ActionPanel>
              <Action.Open
                icon={Icon.Eye}
                title="Open Matted Image"
                target={output.path}
              />
              <Action
                icon={Icon.Clipboard}
                title="Copy Matted Image"
                onAction={async () => {
                  await Clipboard.copy({ file: output.path });
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Copied Matted Image",
                  });
                }}
              />
              <Action.CopyToClipboard
                title="Copy Matted Image Path"
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

async function runMatte(values: FormValues): Promise<MatteResult> {
  const outputRoot = getDefaultOutputRoot();
  await mkdir(outputRoot, { recursive: true });

  const outputDirectory = await mkdtemp(
    path.join(outputRoot, `${OUTPUT_NAMESPACE}-`),
  );
  const ratio = getSelectedRatio(values);
  const args = [
    "matte",
    "--quiet",
    "--ratio",
    ratio,
    "--mode",
    values.mode,
    "--output",
    outputDirectory,
  ];

  if (values.mode === "solid") {
    args.push("--colour", values.colour.trim() || DEFAULT_COLOUR);
  }

  args.push(...values.images);

  await execFileAsync(getDelphitoolsCliPath(), args);

  const outputs = await getOutputFiles(outputDirectory);

  if (outputs.length === 0) {
    throw new Error("No matted images were generated.");
  }

  return {
    outputDirectory,
    outputs,
    mode: values.mode,
    ratio,
  };
}

async function getOutputFiles(outputDirectory: string): Promise<MatteOutput[]> {
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
    .filter((file): file is MatteOutput => file !== null)
    .sort((a, b) => a.path.localeCompare(b.path));
}

function validateFormValues(values: FormValues): {
  title: string;
  message?: string;
} | null {
  if (!values.images?.length) {
    return { title: "Choose at least one image" };
  }

  if (!values.mode) {
    return { title: "Choose a style" };
  }

  const ratio = getSelectedRatio(values);

  if (!RATIO_PATTERN.test(ratio)) {
    return {
      title: "Ratio must be width:height",
      message: "Use positive whole numbers, for example 2:3.",
    };
  }

  if (
    values.mode === "solid" &&
    values.colour.trim() &&
    !COLOUR_PATTERN.test(values.colour.trim())
  ) {
    return {
      title: "Colour is not valid",
      message: "Use a hex colour, CSS colour name, rgb(), or hsl().",
    };
  }

  return null;
}

function getSelectedRatio(values: FormValues): string {
  return values.ratioPreset === "custom"
    ? values.customRatio.trim()
    : values.ratioPreset;
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
