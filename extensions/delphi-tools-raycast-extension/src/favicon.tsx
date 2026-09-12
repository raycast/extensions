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

import { DelphitoolsRequired } from "./delphitools-install";

type FormValues = {
  image: string[];
  sizes: string;
  ico: boolean;
};

type FaviconResult = {
  outputDirectory: string;
  outputs: FaviconOutput[];
};

type FaviconOutput = {
  path: string;
  size: number;
};

const DEFAULT_SIZES = "16,32,48,180,512";
const OUTPUT_NAMESPACE = "favicon";

export default function Command() {
  return (
    <DelphitoolsRequired>
      {({ isCheckingInstall }) => (
        <FaviconForm isCheckingInstall={isCheckingInstall} />
      )}
    </DelphitoolsRequired>
  );
}

function FaviconForm({ isCheckingInstall }: { isCheckingInstall: boolean }) {
  const { push } = useNavigation();

  return (
    <Form
      isLoading={isCheckingInstall}
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues>
            icon={Icon.Image}
            title="Favicon Generator"
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
                const result = await runFavicon(values);

                await showToast({
                  style: Toast.Style.Success,
                  title: "Favicons generated",
                  message: `${result.outputs.length} output file${
                    result.outputs.length === 1 ? "" : "s"
                  } ready.`,
                });

                push(<FaviconResultsList result={result} />);
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : String(error);

                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not generate favicons",
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
        id="sizes"
        title="Sizes"
        defaultValue={DEFAULT_SIZES}
        placeholder="16,32,48,180,512"
      />
      <Form.Checkbox
        id="ico"
        title="ICO"
        label="Generate favicon.ico"
        defaultValue
      />
    </Form>
  );
}

function FaviconResultsList({ result }: { result: FaviconResult }) {
  const outputPaths = result.outputs.map((output) => output.path).join("\n");

  return (
    <List searchBarPlaceholder="Search generated favicons">
      {result.outputs.map((output) => (
        <List.Item
          key={output.path}
          icon={{ source: output.path }}
          title={path.basename(output.path)}
          subtitle={path.dirname(output.path)}
          accessories={[{ text: formatFileSize(output.size) }]}
          actions={
            <ActionPanel>
              <Action.Open
                icon={Icon.Eye}
                title="Open Favicon"
                target={output.path}
              />
              <Action
                icon={Icon.Clipboard}
                title="Copy Favicon"
                onAction={async () => {
                  await Clipboard.copy({ file: output.path });
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Copied Favicon",
                  });
                }}
              />
              <Action.CopyToClipboard
                title="Copy Favicon Path"
                content={output.path}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy All Output Paths"
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

async function runFavicon(values: FormValues): Promise<FaviconResult> {
  const outputRoot = getDefaultOutputRoot();
  await mkdir(outputRoot, { recursive: true });

  const outputDirectory = await mkdtemp(
    path.join(outputRoot, `${OUTPUT_NAMESPACE}-`),
  );
  const args = [
    "favicon",
    "--quiet",
    "--sizes",
    values.sizes.trim(),
    "--output",
    outputDirectory,
  ];

  if (values.ico) {
    args.push("--ico");
  }

  args.push(values.image[0]);

  await execFileAsync(getDelphitoolsCliPath(), args);

  const outputs = await getOutputFiles(outputDirectory);

  if (outputs.length === 0) {
    throw new Error("No favicon files were generated.");
  }

  return {
    outputDirectory,
    outputs,
  };
}

async function getOutputFiles(
  outputDirectory: string,
): Promise<FaviconOutput[]> {
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
    .filter((file): file is FaviconOutput => file !== null)
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
  if (!values.image?.length) {
    return { title: "Choose an image" };
  }

  const sizes = values.sizes.trim();

  if (!sizes) {
    return { title: "Enter favicon sizes" };
  }

  const parsedSizes = sizes.split(",").map((size) => size.trim());
  const invalidSize = parsedSizes.find((size) => {
    const value = Number(size);

    return !/^\d+$/.test(size) || !Number.isSafeInteger(value) || value < 1;
  });

  if (invalidSize !== undefined) {
    return {
      title: "Sizes must be positive integers",
      message: "Use comma-separated values like 16,32,48,180,512.",
    };
  }

  return null;
}
