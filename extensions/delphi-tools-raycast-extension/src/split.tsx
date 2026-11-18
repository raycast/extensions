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

type FormValues = {
  image: string[];
  rows: string;
  cols: string;
};

type SplitOutput = {
  path: string;
  size: number;
};

type SplitResult = {
  outputDirectory: string;
  outputs: SplitOutput[];
  rows: number;
  cols: number;
};

const OUTPUT_NAMESPACE = "split";
const DEFAULT_ROWS = "1";
const DEFAULT_COLS = "1";

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

  return <SplitForm isCheckingInstall={isDelphitoolsInstalled === undefined} />;
}

function SplitForm({ isCheckingInstall }: { isCheckingInstall: boolean }) {
  const { push } = useNavigation();

  return (
    <Form
      isLoading={isCheckingInstall}
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues>
            icon={Icon.Image}
            title="Split Image"
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
                  title: "Splitting image...",
                });

                const result = await runSplit(values);

                await showToast({
                  style: Toast.Style.Success,
                  title: "Image split successfully",
                  message: `${result.outputs.length} tile${
                    result.outputs.length === 1 ? "" : "s"
                  } generated.`,
                });

                push(<SplitResultsList result={result} />);
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : String(error);

                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not split image",
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
      <Form.TextField
        id="rows"
        title="Rows"
        defaultValue={DEFAULT_ROWS}
        placeholder="Number of rows (e.g., 2)"
      />
      <Form.TextField
        id="cols"
        title="Columns"
        defaultValue={DEFAULT_COLS}
        placeholder="Number of columns (e.g., 2)"
      />
      <Form.Description text="Split any image into a grid of smaller tiles locally." />
    </Form>
  );
}

function SplitResultsList({ result }: { result: SplitResult }) {
  const outputPaths = result.outputs.map((output) => output.path).join("\n");

  return (
    <List searchBarPlaceholder="Search split tiles">
      {result.outputs.map((output) => (
        <List.Item
          key={output.path}
          icon={{ source: output.path }}
          title={path.basename(output.path)}
          subtitle={output.path}
          accessories={[
            { text: formatFileSize(output.size) },
            { text: `Grid: ${result.rows}x${result.cols}` },
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
              <Action.CopyToClipboard
                title="Copy All Tile Paths"
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

async function runSplit(values: FormValues): Promise<SplitResult> {
  const outputRoot = getDefaultOutputRoot();
  await mkdir(outputRoot, { recursive: true });

  const outputDirectory = await mkdtemp(
    path.join(outputRoot, `${OUTPUT_NAMESPACE}-`),
  );

  const imagePath = values.image[0];
  const rows = parseInt(values.rows.trim(), 10);
  const cols = parseInt(values.cols.trim(), 10);

  const args = [
    "split",
    "--quiet",
    "--rows",
    rows.toString(),
    "--cols",
    cols.toString(),
    "--output",
    outputDirectory,
    imagePath,
  ];

  await execFileAsync(getDelphitoolsCliPath(), args);

  const outputs = await getOutputFiles(outputDirectory);

  if (outputs.length === 0) {
    throw new Error("No tiles were generated.");
  }

  return {
    outputDirectory,
    outputs,
    rows,
    cols,
  };
}

async function getOutputFiles(outputDirectory: string): Promise<SplitOutput[]> {
  const entries = await readdir(outputDirectory);
  const files = await Promise.all(
    entries.map(async (entry) => {
      if (entry.startsWith(".")) {
        return null;
      }
      const outputPath = path.join(outputDirectory, entry);
      const outputStat = await stat(outputPath);

      return outputStat.isFile()
        ? { path: outputPath, size: outputStat.size }
        : null;
    }),
  );

  return files
    .filter((file): file is SplitOutput => file !== null)
    .sort((a, b) => a.path.localeCompare(b.path));
}

function validateFormValues(values: FormValues): {
  title: string;
  message?: string;
} | null {
  if (!values.image?.length) {
    return { title: "Choose an image" };
  }

  const rowsStr = values.rows.trim();
  if (!rowsStr) {
    return { title: "Rows is required" };
  }
  const rows = Number(rowsStr);
  if (isNaN(rows) || !Number.isInteger(rows) || rows <= 0) {
    return {
      title: "Rows must be a positive integer",
      message: "Enter an integer greater than 0.",
    };
  }

  const colsStr = values.cols.trim();
  if (!colsStr) {
    return { title: "Columns is required" };
  }
  const cols = Number(colsStr);
  if (isNaN(cols) || !Number.isInteger(cols) || cols <= 0) {
    return {
      title: "Columns must be a positive integer",
      message: "Enter an integer greater than 0.",
    };
  }

  return null;
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
