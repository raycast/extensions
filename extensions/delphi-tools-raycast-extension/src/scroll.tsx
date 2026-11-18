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

type RatioPreset = "4:5" | "1:1" | "16:9" | "custom";
type FillMode = "blur" | "colour";

type FormValues = {
  image: string[];
  ratioPreset: RatioPreset;
  customRatio: string;
  fill: FillMode;
  colour: string;
};

type ScrollResult = {
  outputDirectory: string;
  outputs: ScrollOutput[];
  ratio: string;
  fill: FillMode;
};

type ScrollOutput = {
  path: string;
  size: number;
};

const OUTPUT_NAMESPACE = "scroll";
const DEFAULT_COLOUR = "#ffffff";
const RATIO_PATTERN = /^\s*([1-9]\d{0,3})\s*:\s*([1-9]\d{0,3})\s*$/;
const COLOUR_PATTERN =
  /^(#[0-9a-f]{3}([0-9a-f]{3})?|[a-z]+|rgb\(.+\)|hsl\(.+\))$/i;

const RATIO_PRESETS: Array<{ label: string; value: RatioPreset }> = [
  { label: "Portrait (4:5)", value: "4:5" },
  { label: "Square (1:1)", value: "1:1" },
  { label: "Landscape (16:9)", value: "16:9" },
  { label: "Custom", value: "custom" },
];

const FILL_MODES: Array<{ label: string; value: FillMode }> = [
  { label: "Blur", value: "blur" },
  { label: "Colour", value: "colour" },
];

export default function Command() {
  return (
    <DelphitoolsRequired>
      {({ isCheckingInstall }) => (
        <ScrollForm isCheckingInstall={isCheckingInstall} />
      )}
    </DelphitoolsRequired>
  );
}

function ScrollForm({ isCheckingInstall }: { isCheckingInstall: boolean }) {
  const { push } = useNavigation();
  const [selectedRatio, setSelectedRatio] = useState<RatioPreset>("4:5");
  const [selectedFill, setSelectedFill] = useState<FillMode>("blur");
  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <Form
      isLoading={isCheckingInstall || isGenerating}
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues>
            icon={Icon.Image}
            title={
              isGenerating
                ? "Generating Seamless Scroll…"
                : "Generate Seamless Scroll"
            }
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
                  title: "Generating seamless scroll",
                  message: "Splitting wide image into carousel tiles...",
                });

                const result = await runScroll(values);

                await showToast({
                  style: Toast.Style.Success,
                  title: "Seamless scroll generated",
                  message: `${result.outputs.length} tile${
                    result.outputs.length === 1 ? "" : "s"
                  } ready.`,
                });

                push(<ScrollResultsList result={result} />);
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : String(error);

                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not generate seamless scroll",
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
      <Form.Description text="Split a wide image into carousel tiles for Instagram." />

      <Form.FilePicker
        id="image"
        title="Image"
        allowMultipleSelection={false}
        canChooseDirectories={false}
      />

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
          placeholder="4:5"
        />
      ) : null}

      <Form.Dropdown
        id="fill"
        title="Fill Mode"
        value={selectedFill}
        onChange={(value) => setSelectedFill(value as FillMode)}
      >
        {FILL_MODES.map((mode) => (
          <Form.Dropdown.Item
            key={mode.value}
            title={mode.label}
            value={mode.value}
          />
        ))}
      </Form.Dropdown>

      {selectedFill === "colour" ? (
        <Form.TextField
          id="colour"
          title="Fill Colour"
          defaultValue={DEFAULT_COLOUR}
          placeholder="#ffffff"
        />
      ) : null}
    </Form>
  );
}

function ScrollResultsList({ result }: { result: ScrollResult }) {
  const outputPaths = result.outputs.map((output) => output.path).join("\n");

  return (
    <List searchBarPlaceholder="Search generated tiles">
      {result.outputs.map((output, index) => (
        <List.Item
          key={output.path}
          icon={{ source: output.path }}
          title={path.basename(output.path)}
          subtitle={path.dirname(output.path)}
          accessories={[
            { text: formatFileSize(output.size) },
            { text: `Tile ${index + 1}` },
          ]}
          actions={
            <ActionPanel>
              <Action.Open
                icon={Icon.Eye}
                title="Open Tile"
                target={output.path}
              />
              <Action
                icon={Icon.Clipboard}
                title="Copy Tile"
                onAction={async () => {
                  await Clipboard.copy({ file: output.path });
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Copied Tile",
                  });
                }}
              />
              <Action.CopyToClipboard
                title="Copy Tile Path"
                content={output.path}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action
                icon={Icon.Clipboard}
                title="Copy All Tile Paths"
                shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                onAction={async () => {
                  await Clipboard.copy(outputPaths);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Copied All Tile Paths",
                  });
                }}
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

async function runScroll(values: FormValues): Promise<ScrollResult> {
  const outputRoot = getDefaultOutputRoot();
  await mkdir(outputRoot, { recursive: true });

  const outputDirectory = await mkdtemp(
    path.join(outputRoot, `${OUTPUT_NAMESPACE}-`),
  );
  const ratio = getSelectedRatio(values);
  const args = [
    "scroll",
    "--quiet",
    "--ratio",
    ratio,
    "--fill",
    values.fill,
    "--output",
    outputDirectory,
  ];

  if (values.fill === "colour") {
    args.push("--colour", values.colour.trim() || DEFAULT_COLOUR);
  }

  args.push(values.image[0]);

  await execFileAsync(getDelphitoolsCliPath(), args);

  const outputs = await getOutputFiles(outputDirectory);

  if (outputs.length === 0) {
    throw new Error("No tiles were generated.");
  }

  return {
    outputDirectory,
    outputs,
    ratio,
    fill: values.fill,
  };
}

async function getOutputFiles(
  outputDirectory: string,
): Promise<ScrollOutput[]> {
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
    .filter((file): file is ScrollOutput => file !== null)
    .sort((a, b) => a.path.localeCompare(b.path));
}

function validateFormValues(values: FormValues): {
  title: string;
  message?: string;
} | null {
  if (!values.image?.length) {
    return { title: "Choose an image" };
  }

  const ratio = getSelectedRatio(values);

  if (!RATIO_PATTERN.test(ratio)) {
    return {
      title: "Ratio must be width:height",
      message: "Use positive whole numbers, for example 4:5.",
    };
  }

  if (
    values.fill === "colour" &&
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
