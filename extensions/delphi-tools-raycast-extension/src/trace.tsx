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
import { mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { useEffect, useState } from "react";

import {
  DelphitoolsInstallStatusView,
  getDelphitoolsInstallStatus,
} from "./delphitools-install";

type Preset = "default" | "detailed" | "posterize";

type FormValues = {
  image: string[];
  preset: Preset;
  colours: string;
  blur: string;
};

type TraceResult = {
  outputPath: string;
  size: number;
  svgContent: string;
  preset: Preset;
  colours?: string;
  blur: string;
};

const OUTPUT_NAMESPACE = "trace";

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

  return <TraceForm isCheckingInstall={isDelphitoolsInstalled === undefined} />;
}

function TraceForm({ isCheckingInstall }: { isCheckingInstall: boolean }) {
  const { push } = useNavigation();

  return (
    <Form
      isLoading={isCheckingInstall}
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues>
            icon={Icon.Image}
            title="Trace Image"
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
                  title: "Tracing image to SVG...",
                });

                const result = await runTrace(values);

                await showToast({
                  style: Toast.Style.Success,
                  title: "Image traced",
                  message: path.basename(result.outputPath),
                });

                push(<TraceResultDetail result={result} />);
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : String(error);

                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not trace image",
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
      <Form.Dropdown id="preset" title="Preset" defaultValue="default">
        <Form.Dropdown.Item title="Default" value="default" />
        <Form.Dropdown.Item title="Detailed" value="detailed" />
        <Form.Dropdown.Item title="Posterize" value="posterize" />
      </Form.Dropdown>
      <Form.TextField
        id="colours"
        title="Colours"
        placeholder="Optional color count (overrides preset)"
      />
      <Form.TextField
        id="blur"
        title="Blur"
        defaultValue="0"
        placeholder="Pre-blur radius (e.g., 0)"
      />
      <Form.Description text="Trace raster images to SVG vector graphics locally." />
    </Form>
  );
}

function TraceResultDetail({ result }: { result: TraceResult }) {
  // Safe base64 encoding of the SVG for the preview URI
  const svgBase64 = Buffer.from(result.svgContent).toString("base64");
  const svgDataUri = `data:image/svg+xml;base64,${svgBase64}`;

  // Truncate XML preview in markdown if it's too long to prevent Raycast rendering lag
  const maxXmlChars = 3000;
  const isTruncated = result.svgContent.length > maxXmlChars;
  const xmlPreview = isTruncated
    ? `${result.svgContent.slice(0, maxXmlChars)}\n\n<!-- SVG Content truncated for preview. Use copy action for full XML. -->`
    : result.svgContent;

  const markdown = `# Image Traced Successfully

![Traced SVG Preview](${svgDataUri})

## SVG XML Code
\`\`\`xml
${xmlPreview}
\`\`\`
`;

  return (
    <Detail
      markdown={markdown}
      actions={<TraceResultActions result={result} />}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="File"
            text={path.basename(result.outputPath)}
          />
          <Detail.Metadata.Label title="Format" text="SVG Vector" />
          <Detail.Metadata.Label
            title="Size"
            text={formatFileSize(result.size)}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Preset" text={result.preset} />
          {result.colours && (
            <Detail.Metadata.Label title="Colours" text={result.colours} />
          )}
          <Detail.Metadata.Label title="Blur" text={result.blur} />
        </Detail.Metadata>
      }
    />
  );
}

function TraceResultActions({ result }: { result: TraceResult }) {
  return (
    <ActionPanel>
      <Action
        icon={Icon.Clipboard}
        title="Copy SVG XML Code"
        onAction={async () => {
          await Clipboard.copy(result.svgContent);
          await showToast({
            style: Toast.Style.Success,
            title: "Copied SVG XML code",
          });
        }}
      />
      <Action.Open
        icon={Icon.Eye}
        title="Open SVG"
        target={result.outputPath}
      />
      <Action
        icon={Icon.Clipboard}
        title="Copy SVG File"
        onAction={async () => {
          await Clipboard.copy({ file: result.outputPath });
          await showToast({
            style: Toast.Style.Success,
            title: "Copied SVG file",
          });
        }}
      />
      <Action.CopyToClipboard
        title="Copy SVG Path"
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

async function runTrace(values: FormValues): Promise<TraceResult> {
  const inputPath = values.image[0];
  const outputRoot = getDefaultOutputRoot();
  const outputDirectory = path.join(
    outputRoot,
    OUTPUT_NAMESPACE,
    `${Date.now()}`,
  );
  const outputPath = path.join(
    outputDirectory,
    `${path.basename(inputPath, path.extname(inputPath))}.svg`,
  );

  const args = ["trace", "--quiet", "--preset", values.preset];

  const colours = values.colours.trim();
  if (colours) {
    args.push("--colours", colours);
  }

  const blur = values.blur.trim();
  if (blur) {
    args.push("--blur", blur);
  }

  args.push("--output", outputPath, inputPath);

  await mkdir(outputDirectory, { recursive: true });
  await execFileAsync(getDelphitoolsCliPath(), args);

  const outputStat = await stat(outputPath);

  if (!outputStat.isFile() || outputStat.size === 0) {
    throw new Error("delphitools did not generate an SVG file.");
  }

  const svgContent = await readFile(outputPath, "utf8");

  return {
    outputPath,
    size: outputStat.size,
    svgContent,
    preset: values.preset,
    colours: colours || undefined,
    blur: blur || "0",
  };
}

function validateFormValues(values: FormValues): {
  title: string;
  message?: string;
} | null {
  if (!values.image?.length) {
    return { title: "Choose an image" };
  }

  const coloursStr = values.colours.trim();
  if (coloursStr) {
    const colours = Number(coloursStr);
    if (!Number.isInteger(colours) || colours <= 0) {
      return {
        title: "Colours must be a positive integer",
        message: "Enter a whole number greater than 0.",
      };
    }
  }

  const blurStr = values.blur.trim();
  if (blurStr) {
    const blur = Number(blurStr);
    if (isNaN(blur) || blur < 0) {
      return {
        title: "Blur must be a non-negative number",
        message: "Enter a number of 0 or greater.",
      };
    }
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
