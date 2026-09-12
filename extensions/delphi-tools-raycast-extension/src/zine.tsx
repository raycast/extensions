import { execFileAsync, getDelphitoolsCliPath } from "./utils/exec";
import { getDefaultOutputRoot } from "./utils/preferences";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { useEffect, useState } from "react";

import {
  DelphitoolsInstallStatusView,
  getDelphitoolsInstallStatus,
} from "./delphitools-install";

type FormValues = {
  images: string[];
  paper: string;
  dpi: string;
};

type ZineResult = {
  outputPath: string;
  size: number;
  paper: string;
  dpi: string;
};

const OUTPUT_NAMESPACE = "zine";

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

  return <ZineForm isCheckingInstall={isDelphitoolsInstalled === undefined} />;
}

function ZineForm({ isCheckingInstall }: { isCheckingInstall: boolean }) {
  const { push } = useNavigation();

  return (
    <Form
      isLoading={isCheckingInstall}
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues>
            icon={Icon.Book}
            title="Impose Zine"
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
                  title: "Imposing zine layout...",
                });

                const result = await runZine(values);

                await showToast({
                  style: Toast.Style.Success,
                  title: "Zine imposed",
                  message: path.basename(result.outputPath),
                });

                push(<ZineResultDetail result={result} />);
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : String(error);

                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not impose zine",
                  message,
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Arrange exactly 8 page images into a single-sheet mini-zine layout. To control page order, name files sequentially (e.g., '01.png', '02.png' ... '08.png'). The extension will sort the files alphabetically before imposing." />
      <Form.FilePicker
        id="images"
        title="Images"
        allowMultipleSelection={true}
        canChooseDirectories={false}
      />
      <Form.Dropdown id="paper" title="Paper Size" defaultValue="a4">
        <Form.Dropdown.Item title="A4" value="a4" />
        <Form.Dropdown.Item title="Letter" value="letter" />
        <Form.Dropdown.Item title="A3" value="a3" />
        <Form.Dropdown.Item title="A5" value="a5" />
      </Form.Dropdown>
      <Form.TextField
        id="dpi"
        title="DPI"
        defaultValue="300"
        placeholder="300"
      />
    </Form>
  );
}

function ZineResultDetail({ result }: { result: ZineResult }) {
  return (
    <Detail
      markdown={`# Zine PDF Imposed Successfully

Your 8-page mini-zine layout is ready.

\`${result.outputPath}\`
`}
      actions={<ZineResultActions result={result} />}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="File"
            text={path.basename(result.outputPath)}
          />
          <Detail.Metadata.Label
            title="Paper Size"
            text={result.paper.toUpperCase()}
          />
          <Detail.Metadata.Label title="DPI" text={result.dpi} />
          <Detail.Metadata.Label
            title="Size"
            text={formatFileSize(result.size)}
          />
        </Detail.Metadata>
      }
    />
  );
}

function ZineResultActions({ result }: { result: ZineResult }) {
  return (
    <ActionPanel>
      <Action.Open
        icon={Icon.Eye}
        title="Open Zine PDF"
        target={result.outputPath}
      />
      <Action
        icon={Icon.Clipboard}
        title="Copy PDF File"
        onAction={async () => {
          await Clipboard.copy({ file: result.outputPath });
          await showToast({
            style: Toast.Style.Success,
            title: "Copied Zine PDF",
          });
        }}
      />
      <Action.CopyToClipboard
        title="Copy PDF Path"
        content={result.outputPath}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
      <Action.ShowInFinder
        title="Reveal in Finder"
        path={result.outputPath}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
    </ActionPanel>
  );
}

async function runZine(values: FormValues): Promise<ZineResult> {
  const outputRoot = getDefaultOutputRoot();
  const outputDirectory = path.join(
    outputRoot,
    OUTPUT_NAMESPACE,
    `${Date.now()}`,
  );

  const sortedImages = [...values.images].sort((a, b) => a.localeCompare(b));
  const baseName = sortedImages[0]
    ? path.basename(sortedImages[0], path.extname(sortedImages[0]))
    : "zine";
  const outputPath = path.join(outputDirectory, `${baseName}-zine.pdf`);

  const args = [
    "zine",
    "--paper",
    values.paper,
    "--dpi",
    values.dpi.trim(),
    "--quiet",
    "--output",
    outputPath,
    ...sortedImages,
  ];

  await mkdir(outputDirectory, { recursive: true });
  await execFileAsync(getDelphitoolsCliPath(), args);

  const outputStat = await stat(outputPath);

  if (!outputStat.isFile() || outputStat.size === 0) {
    throw new Error("delphitools did not generate a zine PDF.");
  }

  return {
    outputPath,
    size: outputStat.size,
    paper: values.paper,
    dpi: values.dpi.trim(),
  };
}

function validateFormValues(values: FormValues): {
  title: string;
  message?: string;
} | null {
  if (!values.images || values.images.length === 0) {
    return { title: "Please select 8 images" };
  }

  if (values.images.length !== 8) {
    return {
      title: "Exactly 8 images are required",
      message: `You selected ${values.images.length} image(s). Please choose exactly 8.`,
    };
  }

  const dpiStr = values.dpi.trim();
  if (!dpiStr) {
    return { title: "DPI is required" };
  }

  const dpi = Number(dpiStr);
  if (isNaN(dpi) || !Number.isInteger(dpi) || dpi <= 0) {
    return {
      title: "DPI must be a positive integer",
      message: "Enter a positive integer, e.g., 300.",
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
