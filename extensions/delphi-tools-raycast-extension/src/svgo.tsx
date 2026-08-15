import { execFileAsync, getDelphitoolsCliPath } from "./utils/exec";
import { getDefaultOutputRoot } from "./utils/preferences";
import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { useEffect, useState } from "react";

import {
  DelphitoolsInstallStatusView,
  getDelphitoolsInstallStatus,
} from "./delphitools-install";

type FormValues = {
  files: string[];
  svgCode: string;
};

type SvgoOutput = {
  originalPath: string;
  originalSize: number;
  path: string;
  size: number;
  content: string;
};

type SvgoResult = {
  outputDirectory: string;
  outputs: SvgoOutput[];
};

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

  return <SvgoForm isCheckingInstall={isDelphitoolsInstalled === undefined} />;
}

function SvgoForm({ isCheckingInstall }: { isCheckingInstall: boolean }) {
  const { push } = useNavigation();

  async function onSubmit(values: FormValues) {
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
        title: "Optimising SVG...",
      });

      const result = await runSvgo(values);

      await showToast({
        style: Toast.Style.Success,
        title: "SVG optimised",
        message: `${result.outputs.length} file${
          result.outputs.length === 1 ? "" : "s"
        } processed.`,
      });

      // If only code was pasted, show detail view. Otherwise show list view.
      const hasFilesSelected = values.files && values.files.length > 0;
      if (!hasFilesSelected && result.outputs.length === 1) {
        push(<SvgoDetail result={result} />);
      } else {
        push(<SvgoResultsList result={result} />);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Could not optimise SVG",
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
            icon={Icon.Check}
            title="Optimise SVG"
            onSubmit={onSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        title="SVG Files"
        allowMultipleSelection
        canChooseDirectories={false}
      />
      <Form.TextArea
        id="svgCode"
        title="SVG Code"
        placeholder="Paste raw SVG XML code here..."
      />
      <Form.Description text="Select SVG files or paste SVG code to optimise them locally and safely." />
    </Form>
  );
}

function SvgoDetail({ result }: { result: SvgoResult }) {
  const output = result.outputs[0];

  async function copyContent() {
    await Clipboard.copy(output.content);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied SVG Content",
    });
  }

  async function copyFileToClipboard() {
    await Clipboard.copy({ file: output.path });
    await showToast({
      style: Toast.Style.Success,
      title: "Copied SVG File",
    });
  }

  return (
    <Detail
      markdown={[
        `# Optimized SVG`,
        "",
        `<img src="${output.path}" width="300" />`,
        "",
        "## Code",
        "",
        "```xml",
        output.content,
        "```",
      ].join("\n")}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Clipboard}
            title="Copy SVG Content"
            onAction={copyContent}
          />
          <Action.Push
            icon={Icon.Download}
            title="Download / Save Optimized SVG"
            target={
              <SaveSvgForm
                sourcePath={output.path}
                defaultFilename="optimized.svg"
              />
            }
          />
          <Action.Open icon={Icon.Eye} title="Open SVG" target={output.path} />
          <Action
            icon={Icon.Clipboard}
            title="Copy SVG File"
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={copyFileToClipboard}
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
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Original Size"
            text={formatFileSize(output.originalSize)}
          />
          <Detail.Metadata.Label
            title="Optimized Size"
            text={formatFileSize(output.size)}
          />
          <Detail.Metadata.Label
            title="Reduction"
            text={getReductionString(output.originalSize, output.size)}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Temporary Path" text={output.path} />
        </Detail.Metadata>
      }
    />
  );
}

function SvgoResultsList({ result }: { result: SvgoResult }) {
  return (
    <List searchBarPlaceholder="Search optimized SVGs">
      {result.outputs.map((output) => (
        <List.Item
          key={output.path}
          icon={{ source: output.path }}
          title={path.basename(
            output.originalPath.endsWith("pasted.svg")
              ? "optimized.svg"
              : output.originalPath,
          )}
          subtitle={
            output.originalPath.endsWith("pasted.svg")
              ? "Pasted SVG Code"
              : path.dirname(output.originalPath)
          }
          accessories={[
            {
              text: `${formatFileSize(output.originalSize)} → ${formatFileSize(output.size)}`,
            },
            {
              text: {
                value: `(${getReductionString(output.originalSize, output.size)})`,
                color: Color.Green,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Open
                icon={Icon.Eye}
                title="Open SVG"
                target={output.path}
              />
              <Action
                icon={Icon.Clipboard}
                title="Copy SVG Content"
                onAction={async () => {
                  await Clipboard.copy(output.content);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Copied SVG Content",
                  });
                }}
              />
              <Action
                icon={Icon.Clipboard}
                title="Copy SVG File"
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                onAction={async () => {
                  await Clipboard.copy({ file: output.path });
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Copied SVG File",
                  });
                }}
              />
              <Action.Push
                icon={Icon.Download}
                title="Download / Save Optimized SVG"
                target={
                  <SaveSvgForm
                    sourcePath={output.path}
                    defaultFilename={
                      output.originalPath.endsWith("pasted.svg")
                        ? "optimized.svg"
                        : path.basename(output.originalPath)
                    }
                  />
                }
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

type SaveFormValues = {
  directory: string[];
  filename: string;
};

function SaveSvgForm({
  sourcePath,
  defaultFilename,
}: {
  sourcePath: string;
  defaultFilename: string;
}) {
  const { pop } = useNavigation();

  async function handleSave(values: SaveFormValues) {
    if (!values.directory || values.directory.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Destination Folder is required",
      });
      return;
    }
    const destDir = values.directory[0];
    const cleanFilename = values.filename.trim();
    if (!cleanFilename) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Filename is required",
      });
      return;
    }
    const destPath = path.join(
      destDir,
      cleanFilename.toLowerCase().endsWith(".svg")
        ? cleanFilename
        : `${cleanFilename}.svg`,
    );

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Saving SVG file...",
      });
      await copyFile(sourcePath, destPath);
      await showToast({
        style: Toast.Style.Success,
        title: "SVG Saved Successfully",
        message: destPath,
      });
      pop();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save SVG",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save SVG" onSubmit={handleSave} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="directory"
        title="Destination Folder"
        canChooseFiles={false}
        canChooseDirectories={true}
        allowMultipleSelection={false}
      />
      <Form.TextField
        id="filename"
        title="Filename"
        defaultValue={defaultFilename}
        placeholder="Enter filename"
      />
    </Form>
  );
}

async function runSvgo(values: FormValues): Promise<SvgoResult> {
  const outputRoot = getDefaultOutputRoot();
  await mkdir(outputRoot, { recursive: true });

  const outputDirectory = await mkdtemp(path.join(outputRoot, "svgo-output-"));
  const outputs: SvgoOutput[] = [];

  const fileInputs = [...(values.files || [])];

  // If svgCode is provided, write it to a temp input file and add to list
  if (values.svgCode && values.svgCode.trim()) {
    const tempInputDirectory = await mkdtemp(
      path.join(outputRoot, "svgo-input-"),
    );
    const pastedInputPath = path.join(tempInputDirectory, "pasted.svg");
    await writeFile(pastedInputPath, values.svgCode, "utf8");
    fileInputs.push(pastedInputPath);
  }

  for (const inputPath of fileInputs) {
    const nameWithoutExt = path.basename(inputPath, ".svg");
    const outputName = inputPath.endsWith("pasted.svg")
      ? "optimized.svg"
      : `${nameWithoutExt}-optimised.svg`;

    const outputPath = path.join(outputDirectory, outputName);

    const originalStat = await stat(inputPath);

    // Run delphitools svgo
    await execFileAsync(getDelphitoolsCliPath(), [
      "svgo",
      "--quiet",
      "--output",
      outputPath,
      inputPath,
    ]);

    const optimizedStat = await stat(outputPath);
    const content = await readFile(outputPath, "utf8");

    outputs.push({
      originalPath: inputPath,
      originalSize: originalStat.size,
      path: outputPath,
      size: optimizedStat.size,
      content,
    });
  }

  return {
    outputDirectory,
    outputs,
  };
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

function getReductionString(original: number, optimized: number): string {
  if (original <= 0) return "0% reduction";
  const reduction = ((original - optimized) / original) * 100;
  return `${reduction.toFixed(1)}% reduction`;
}

function validateFormValues(values: FormValues): {
  title: string;
  message?: string;
} | null {
  const hasFiles = values.files && values.files.length > 0;
  const hasCode = values.svgCode && values.svgCode.trim().length > 0;

  if (!hasFiles && !hasCode) {
    return {
      title: "Provide input",
      message: "Please choose at least one SVG file or paste SVG code.",
    };
  }

  if (hasFiles) {
    for (const file of values.files) {
      if (!file.toLowerCase().endsWith(".svg")) {
        return {
          title: "Invalid file type",
          message: "Only SVG files are supported.",
        };
      }
    }
  }

  return null;
}
