import { getDefaultOutputRoot } from "./preferences";
import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";

export type ImageOutput = {
  path: string;
  size: number;
};

export type ImageOutputResult<TOutput extends ImageOutput = ImageOutput> = {
  outputDirectory: string;
  outputs: TOutput[];
  outputPaths: string[];
};

type ImageResultsProps<TOutput extends ImageOutput> = {
  result: ImageOutputResult<TOutput>;
  searchBarPlaceholder: string;
  openTitle: string;
  copyImageTitle: string;
  copyImagePathTitle: string;
  copiedImageTitle: string;
};

export async function createOutputDirectory(
  namespace: string,
): Promise<string> {
  const outputRoot = getDefaultOutputRoot();
  await mkdir(outputRoot, { recursive: true });

  const hash = Math.random().toString(36).slice(2, 10);
  const outputDirectory = path.join(
    outputRoot,
    namespace,
    `${Date.now()}-${hash}`,
  );
  await mkdir(outputDirectory, { recursive: true });

  return outputDirectory;
}

export async function getImageOutputFiles(
  outputDirectory: string,
): Promise<ImageOutput[]> {
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
    .filter((file): file is ImageOutput => file !== null)
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function ImageResults<TOutput extends ImageOutput>({
  result,
  searchBarPlaceholder,
  openTitle,
  copyImageTitle,
  copyImagePathTitle,
  copiedImageTitle,
}: ImageResultsProps<TOutput>) {
  const allPaths = result.outputPaths.join("\n");

  return (
    <List searchBarPlaceholder={searchBarPlaceholder}>
      {result.outputs.map((output) => (
        <List.Item
          key={output.path}
          icon={{ source: output.path }}
          title={path.basename(output.path)}
          subtitle={path.dirname(output.path)}
          accessories={[{ text: formatFileSize(output.size) }]}
          actions={
            <ImageActions
              outputPath={output.path}
              allPaths={allPaths}
              outputDirectory={result.outputDirectory}
              openTitle={openTitle}
              copyImageTitle={copyImageTitle}
              copyImagePathTitle={copyImagePathTitle}
              copiedImageTitle={copiedImageTitle}
            />
          }
        />
      ))}
    </List>
  );
}

function ImageActions({
  outputPath,
  allPaths,
  outputDirectory,
  openTitle,
  copyImageTitle,
  copyImagePathTitle,
  copiedImageTitle,
}: {
  outputPath: string;
  allPaths: string;
  outputDirectory: string;
  openTitle: string;
  copyImageTitle: string;
  copyImagePathTitle: string;
  copiedImageTitle: string;
}) {
  async function copyImage() {
    await Clipboard.copy({ file: outputPath });
    await showToast({
      style: Toast.Style.Success,
      title: copiedImageTitle,
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
      <Action.Open icon={Icon.Eye} title={openTitle} target={outputPath} />
      <Action
        icon={Icon.Clipboard}
        title={copyImageTitle}
        onAction={copyImage}
      />
      <Action.CopyToClipboard
        title={copyImagePathTitle}
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
