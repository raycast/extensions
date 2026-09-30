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
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { useEffect, useState } from "react";

import {
  DelphitoolsInstallStatusView,
  getDelphitoolsInstallStatus,
} from "./delphitools-install";

type FormValues = {
  images: string[];
};

type ClipResult = {
  outputDirectory: string;
  outputPaths: string[];
};

const OUTPUT_NAMESPACE = "clip";
const PNG_EXTENSION = ".png";

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

  return <ClipForm isCheckingInstall={isDelphitoolsInstalled === undefined} />;
}

function ClipForm({ isCheckingInstall }: { isCheckingInstall: boolean }) {
  const { push } = useNavigation();

  return (
    <Form
      isLoading={isCheckingInstall}
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues>
            icon={Icon.Image}
            title="Trim Transparent Edges"
            onSubmit={async (values) => {
              const images = values.images ?? [];

              if (images.length === 0) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Choose at least one PNG",
                });
                return;
              }

              const invalidImage = images.find((image) => !isPngPath(image));

              if (invalidImage) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Unsupported image type",
                  message: "Choose PNG images only.",
                });
                return;
              }

              try {
                const result = await runClip(images);

                await showToast({
                  style: Toast.Style.Success,
                  title: "Transparent edges trimmed",
                  message: `${result.outputPaths.length} output file${
                    result.outputPaths.length === 1 ? "" : "s"
                  } generated.`,
                });

                push(<ClipResults result={result} />);
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : String(error);

                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not trim transparent edges",
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
        title="PNG Images"
        allowMultipleSelection
        canChooseDirectories={false}
      />
      <Form.Description text="You can select multiple PNG images." />
    </Form>
  );
}

function ClipResults({ result }: { result: ClipResult }) {
  return (
    <List>
      {result.outputPaths.map((outputPath) => (
        <List.Item
          key={outputPath}
          title={path.basename(outputPath)}
          subtitle={outputPath}
          icon={{ source: outputPath }}
          accessories={[{ text: result.outputDirectory }]}
          actions={<ClipActions outputPath={outputPath} result={result} />}
        />
      ))}
    </List>
  );
}

function ClipActions({
  outputPath,
  result,
}: {
  outputPath: string;
  result: ClipResult;
}) {
  async function copyImage() {
    await Clipboard.copy({ file: outputPath });
    await showToast({
      style: Toast.Style.Success,
      title: "Copied Trimmed Image",
    });
  }

  async function copyAllPaths() {
    await Clipboard.copy(result.outputPaths.join("\n"));
    await showToast({
      style: Toast.Style.Success,
      title: "Copied Output Paths",
    });
  }

  return (
    <ActionPanel>
      <Action.Open
        icon={Icon.Eye}
        title="Open Trimmed Image"
        target={outputPath}
      />
      <Action
        icon={Icon.Clipboard}
        title="Copy Trimmed Image"
        onAction={copyImage}
      />
      <Action.CopyToClipboard
        title="Copy Trimmed Image Path"
        content={outputPath}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
      <Action
        icon={Icon.Clipboard}
        title="Copy All Output Paths"
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        onAction={copyAllPaths}
      />
      <Action.ShowInFinder path={outputPath} />
    </ActionPanel>
  );
}

async function runClip(images: string[]): Promise<ClipResult> {
  const outputDirectory = path.join(
    getDefaultOutputRoot(),
    OUTPUT_NAMESPACE,
    `${Date.now()}`,
  );

  await mkdir(outputDirectory, { recursive: true });
  await execFileAsync(getDelphitoolsCliPath(), [
    "clip",
    "--quiet",
    "--output",
    outputDirectory,
    ...images,
  ]);

  const outputPaths = (await readdir(outputDirectory))
    .filter(isPngPath)
    .sort((a, b) => a.localeCompare(b))
    .map((fileName) => path.join(outputDirectory, fileName));

  if (outputPaths.length === 0) {
    throw new Error("delphitools did not generate any PNG files.");
  }

  return {
    outputDirectory,
    outputPaths,
  };
}

function isPngPath(imagePath: string): boolean {
  return path.extname(imagePath).toLowerCase() === PNG_EXTENSION;
}
