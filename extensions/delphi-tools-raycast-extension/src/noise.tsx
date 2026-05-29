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
import { useEffect, useState } from "react";

import {
  DelphitoolsInstallStatusView,
  getDelphitoolsInstallStatus,
} from "./delphitools-install";

type FormValues = {
  images: string[];
  opacity: string;
  scale: string;
  seed: string;
};

type NoiseOutput = {
  path: string;
  size: number;
};

type NoiseResult = {
  outputDirectory: string;
  outputs: NoiseOutput[];
  outputPaths: string[];
};

const OUTPUT_NAMESPACE = "noise";
const DEFAULT_OPACITY = "0.15";
const DEFAULT_SCALE = "1.0";

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

  return <NoiseForm isCheckingInstall={isDelphitoolsInstalled === undefined} />;
}

function NoiseForm({ isCheckingInstall }: { isCheckingInstall: boolean }) {
  const { push } = useNavigation();

  return (
    <Form
      isLoading={isCheckingInstall}
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues>
            icon={Icon.Image}
            title="Add Noise to Images"
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
                  title: "Adding noise to images...",
                });

                const result = await runNoise(values);

                await showToast({
                  style: Toast.Style.Success,
                  title: "Noise added",
                  message: `${result.outputs.length} image${
                    result.outputs.length === 1 ? "" : "s"
                  } processed.`,
                });

                push(<NoiseResults result={result} />);
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : String(error);

                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not add noise to images",
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
        placeholder="Greater than 0 (e.g., 1.0)"
      />
      <Form.TextField
        id="seed"
        title="Seed"
        placeholder="Optional (random by default)"
      />
      <Form.Description text="You can select multiple images. Noise overlay is added locally and safely." />
    </Form>
  );
}

function NoiseResults({ result }: { result: NoiseResult }) {
  const allPaths = result.outputPaths.join("\n");

  return (
    <List searchBarPlaceholder="Search processed images">
      {result.outputs.map((output) => (
        <List.Item
          key={output.path}
          icon={{ source: output.path }}
          title={path.basename(output.path)}
          subtitle={path.dirname(output.path)}
          accessories={[{ text: formatFileSize(output.size) }]}
          actions={
            <NoiseActions
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

function NoiseActions({
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
      title: "Copied Noisy Image",
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
        title="Open Noisy Image"
        target={outputPath}
      />
      <Action
        icon={Icon.Clipboard}
        title="Copy Noisy Image"
        onAction={copyImage}
      />
      <Action.CopyToClipboard
        title="Copy Noisy Image Path"
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

async function runNoise(values: FormValues): Promise<NoiseResult> {
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
    "noise",
    "--quiet",
    "--output",
    outputDirectory,
    ...values.images,
  ];

  const opacity = values.opacity.trim();
  if (opacity) {
    args.push("--opacity", opacity);
  }

  const scale = values.scale.trim();
  if (scale) {
    args.push("--scale", scale);
  }

  const seed = values.seed.trim();
  if (seed) {
    args.push("--seed", seed);
  }

  await execFileAsync(getDelphitoolsCliPath(), args);

  const outputs = await getOutputFiles(outputDirectory);

  if (outputs.length === 0) {
    throw new Error("No noisy images were generated.");
  }

  return {
    outputDirectory,
    outputs,
    outputPaths: outputs.map((out) => out.path),
  };
}

async function getOutputFiles(outputDirectory: string): Promise<NoiseOutput[]> {
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
    .filter((file): file is NoiseOutput => file !== null)
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
  if (isNaN(scale) || scale <= 0) {
    return {
      title: "Scale must be greater than 0",
      message: "Enter a number greater than 0.",
    };
  }

  return null;
}
