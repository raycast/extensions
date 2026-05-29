import { execFileAsync, getDelphitoolsCliPath } from "./utils/exec";
import { getDefaultOutputRoot } from "./utils/preferences";
import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  List,
  LocalStorage,
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
};

type RmbgOutput = {
  path: string;
  size: number;
};

type RmbgResult = {
  outputDirectory: string;
  outputs: RmbgOutput[];
  outputPaths: string[];
};

const OUTPUT_NAMESPACE = "rmbg";
const FIRST_RUN_KEY = "rmbg-has-run";

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

  return <RmbgForm isCheckingInstall={isDelphitoolsInstalled === undefined} />;
}

function RmbgForm({ isCheckingInstall }: { isCheckingInstall: boolean }) {
  const { push } = useNavigation();

  return (
    <Form
      isLoading={isCheckingInstall}
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues>
            icon={Icon.Image}
            title="Remove Background"
            onSubmit={async (values) => {
              const images = values.images ?? [];

              if (images.length === 0) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Choose at least one image",
                });
                return;
              }

              try {
                const hasRunBefore =
                  await LocalStorage.getItem<boolean>(FIRST_RUN_KEY);
                const toastTitle = hasRunBefore
                  ? "Removing background..."
                  : "Removing background (Downloading model on first run)...";

                await showToast({
                  style: Toast.Style.Animated,
                  title: toastTitle,
                });

                const result = await runRmbg(images);

                await LocalStorage.setItem(FIRST_RUN_KEY, true);

                await showToast({
                  style: Toast.Style.Success,
                  title: "Background removed",
                  message: `${result.outputs.length} image${
                    result.outputs.length === 1 ? "" : "s"
                  } processed.`,
                });

                push(<RmbgResults result={result} />);
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : String(error);

                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not remove background",
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
      <Form.Description text="Background removal is processed locally and safely. Warning: The first use will download a ~170 MB background-removal model, which may take a moment." />
    </Form>
  );
}

function RmbgResults({ result }: { result: RmbgResult }) {
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
            <RmbgActions
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

function RmbgActions({
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
      title: "Copied Image",
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
      <Action.Open icon={Icon.Eye} title="Open Image" target={outputPath} />
      <Action icon={Icon.Clipboard} title="Copy Image" onAction={copyImage} />
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

async function runRmbg(images: string[]): Promise<RmbgResult> {
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
    "rmbg",
    "--approve",
    "--quiet",
    "--output",
    outputDirectory,
    ...images,
  ];

  await execFileAsync(getDelphitoolsCliPath(), args);

  const outputs = await getOutputFiles(outputDirectory);

  if (outputs.length === 0) {
    throw new Error("No processed images were generated.");
  }

  return {
    outputDirectory,
    outputs,
    outputPaths: outputs.map((out) => out.path),
  };
}

async function getOutputFiles(outputDirectory: string): Promise<RmbgOutput[]> {
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
    .filter((file): file is RmbgOutput => file !== null)
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
