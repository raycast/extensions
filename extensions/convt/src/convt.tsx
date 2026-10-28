import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Form,
  getSelectedFinderItems,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import path from "node:path";
import {
  convertFiles,
  inspectFiles,
  validateOptions,
  type ConversionProgress,
  type ConversionResult,
  type FileInspection,
} from "./lib/convt";
import { getBinary } from "./lib/preferences";

const DOWNLOAD_URL = "https://convt.app/download";
const INSTALL_COMMAND = "brew tap opencoredev/convt https://github.com/opencoredev/convt && brew install --cask convt";

export default function Command() {
  const { data: binary, error, isLoading, revalidate } = usePromise(getBinary);
  const [files, setFiles] = useState<string[]>([]);
  const selectionChanged = useRef(false);

  useEffect(() => {
    if (process.platform !== "darwin") return;
    let active = true;
    getSelectedFinderItems()
      .then((items) => {
        if (active && !selectionChanged.current) setFiles(items.map((item) => item.path));
      })
      .catch(() => {
        /* The file picker is available when Finder has no selection. */
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <Detail
        markdown={`# Set up Convt\n\n${error.message}\n\nInstall [Convt](${DOWNLOAD_URL}), then try again. The CLI is included with the app.\n\n${process.platform === "darwin" ? `You can also install it with Homebrew:\n\n\`\`\`sh\n${INSTALL_COMMAND}\n\`\`\`\n\n` : ""}For a custom installation, set **Convt CLI Path** in this extension's preferences.\n\nConvt's packaged builds require a trial or license. Files are converted locally.`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Download Convt" url={DOWNLOAD_URL} />
            <Action title="Check Installation Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            {process.platform === "darwin" && (
              <Action.CopyToClipboard title="Copy Install Command" content={INSTALL_COMMAND} />
            )}
          </ActionPanel>
        }
      />
    );
  }
  if (!binary) return <Detail isLoading={isLoading} markdown="Checking Convt installation…" />;
  return (
    <Converter
      binary={binary}
      files={files}
      setFiles={(next) => {
        selectionChanged.current = true;
        setFiles(next);
      }}
    />
  );
}

type FormValues = {
  target: string;
  outputDirectory: string[];
  quality?: string;
  maxSize?: string;
  pages?: string;
  dpi?: string;
};

type Discovery = { files: string[]; binary: string } & (
  { status: "ready"; inspection: FileInspection } | { status: "error"; message: string }
);

function Converter({
  binary,
  files,
  setFiles,
}: {
  binary: string;
  files: string[];
  setFiles: (files: string[]) => void;
}) {
  const { push } = useNavigation();
  const [discovery, setDiscovery] = useState<Discovery>();
  const [manualTarget, setManualTarget] = useState("");
  const [outputDirectory, setOutputDirectory] = useState<string[]>([]);
  const [quality, setQuality] = useState("");
  const [maxSize, setMaxSize] = useState("");
  const [pages, setPages] = useState("");
  const [dpi, setDpi] = useState("");
  const [requiredError, setRequiredError] = useState(false);
  const [progress, setProgress] = useState<ConversionProgress>();
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const current = discovery?.files === files && discovery.binary === binary ? discovery : undefined;
  const inspection = current?.status === "ready" ? current.inspection : undefined;
  const formats = inspection?.targets ?? [];
  const loadingTargets = files.length > 0 && !current;
  // Removing the selected ID during loading makes Raycast select the first new option.
  const target =
    loadingTargets || formats.some((format) => format.id === manualTarget)
      ? manualTarget
      : (inspection?.suggestedTargetIds[0] ?? formats[0]?.id ?? "");
  const fileError = !files.length
    ? requiredError
      ? "Choose at least one file."
      : undefined
    : current?.status === "error"
      ? current.message
      : inspection?.sources.some((source) => !source.format)
        ? "Convt does not recognize every file extension. Choose supported files."
        : inspection && !formats.length
          ? "No shared output format. Choose compatible files and check that Convt's required engines are installed."
          : undefined;

  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    setDiscovery(undefined);
    setRequiredError(false);
    if (!files.length) {
      setManualTarget("");
      return;
    }
    inspectFiles(binary, files, abort.signal)
      .then((inspection) => {
        if (!active) return;
        setDiscovery({ files, binary, status: "ready", inspection });
        setManualTarget((previous) => (inspection.targets.some((format) => format.id === previous) ? previous : ""));
      })
      .catch((error: unknown) => {
        if (active)
          setDiscovery({
            files,
            binary,
            status: "error",
            message: error instanceof Error ? error.message : String(error),
          });
      });
    return () => {
      active = false;
      abort.abort();
    };
  }, [binary, files]);

  useEffect(() => () => controller.current?.abort(), []);

  async function submit(values: FormValues) {
    if (controller.current || loadingTargets) return;
    if (!files.length) {
      setRequiredError(true);
      return;
    }
    if (!formats.some((format) => format.id === values.target)) {
      await showToast({ style: Toast.Style.Failure, title: "Choose an available output format" });
      return;
    }
    const number = (value?: string) => (value?.trim() ? Number(value) : undefined);
    const options = {
      quality: number(values.quality),
      maxSize: number(values.maxSize),
      dpi: number(values.dpi),
      pages: values.pages?.trim() || undefined,
    };
    try {
      validateOptions(options);
    } catch (error) {
      await showFailureToast(error, { title: "Check conversion options" });
      return;
    }
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setProgress({ input: files[0], completed: 0, total: files.length, fraction: null });
    try {
      const converted = await convertFiles(
        binary,
        { files, target: values.target, outputDirectory: values.outputDirectory[0], ...options },
        {
          signal: abort.signal,
          onProgress: setProgress,
        },
      );
      push(<Results results={converted} />);
      const done = converted.filter((result) => result.status === "done").length;
      await showToast({
        style: done === converted.length ? Toast.Style.Success : Toast.Style.Failure,
        title: `${done} of ${converted.length} files converted`,
        message: done === converted.length ? "Your converted files are ready." : "See results for details.",
      });
    } catch (error) {
      await showFailureToast(error, { title: "Conversion failed" });
    } finally {
      controller.current = null;
      setBusy(false);
      setProgress(undefined);
    }
  }

  const selectedFormat = formats.find((format) => format.id === target);
  const image = selectedFormat?.category === "image";
  const video = selectedFormat?.category === "video";
  const hasPdf = files.some((file) => path.extname(file).toLowerCase() === ".pdf");
  const hasSvg = files.some((file) => path.extname(file).toLowerCase() === ".svg");
  const sourceCounts = new Map<string, number>();
  for (const source of inspection?.sources ?? []) {
    const label = source.format
      ? source.format.name.toLowerCase() === source.format.category.toLowerCase()
        ? source.format.name
        : `${source.format.name} ${source.format.category}`
      : source.extension
        ? `Unknown (.${source.extension})`
        : "No file extension";
    sourceCounts.set(label, (sourceCounts.get(label) ?? 0) + 1);
  }
  const sourceSummary = [...sourceCounts]
    .map(([label, count]) => `${label} · ${count} file${count === 1 ? "" : "s"}`)
    .join("; ");
  const suggested = (inspection?.suggestedTargetIds ?? []).flatMap((id) =>
    formats.filter((format) => format.id === id),
  );
  const others = formats.filter((format) => !inspection?.suggestedTargetIds.includes(format.id));
  const sections = [
    { title: "Suggested", formats: suggested },
    ...[...new Set(others.map((format) => format.category))].map((category) => ({
      title: category.charAt(0).toUpperCase() + category.slice(1),
      formats: others.filter((format) => format.category === category),
    })),
  ].filter((section) => section.formats.length);

  return (
    <Form
      isLoading={loadingTargets || busy}
      actions={
        <ActionPanel>
          {busy ? (
            <Action title="Cancel Conversion" icon={Icon.XMarkCircle} onAction={() => controller.current?.abort()} />
          ) : (
            <Action.SubmitForm title="Convert Files" icon={Icon.ArrowRight} onSubmit={submit} />
          )}
          {process.platform === "darwin" && (
            <Action
              title="Use Finder Selection"
              icon={Icon.Finder}
              onAction={async () => {
                try {
                  setFiles((await getSelectedFinderItems()).map((item) => item.path));
                } catch (error) {
                  await showFailureToast(error, { title: "Could not read Finder selection" });
                }
              }}
            />
          )}
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action.OpenInBrowser title="Open Convt Help" url="https://github.com/opencoredev/convt#engines" />
        </ActionPanel>
      }
    >
      <Form.Description text="Convert files locally with Convt. Originals are preserved; existing output names receive a numbered suffix." />
      {busy && (
        <Form.Description
          title="Converting"
          text={
            progress
              ? `${path.basename(progress.input)} — ${progress.completed} of ${progress.total} completed${progress.fraction != null ? ` (${Math.floor(progress.fraction * 100)}%)` : ""}`
              : "Preparing conversion…"
          }
        />
      )}
      <Form.FilePicker
        id="files"
        title="Files"
        value={files}
        onChange={setFiles}
        error={fileError}
        canChooseDirectories={false}
        allowMultipleSelection
      />
      {!!files.length && (
        <Form.Description
          title="Detected File Types"
          text={
            loadingTargets
              ? "Checking file extensions…"
              : sourceSummary
                ? `${sourceSummary}. Based on file extensions.`
                : "Could not identify file types."
          }
        />
      )}
      <Form.Dropdown
        id="target"
        title="Output Format"
        value={target}
        onChange={(value) => {
          if (!loadingTargets && value !== target && formats.some((format) => format.id === value))
            setManualTarget(value);
        }}
        info="All formats work for every selected file. Suggestions come from Convt."
      >
        {!formats.length && (
          <Form.Dropdown.Item
            value={target}
            title={
              loadingTargets
                ? "Finding available formats…"
                : files.length
                  ? "No available formats"
                  : "Choose files first"
            }
          />
        )}
        {sections.map((section) => (
          <Form.Dropdown.Section key={section.title} title={section.title}>
            {section.formats.map((format) => (
              <Form.Dropdown.Item
                key={format.id}
                value={format.id}
                title={`${format.name} (.${format.extensions[0] || format.id})`}
              />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>
      <Form.FilePicker
        id="outputDirectory"
        title="Output Folder"
        value={outputDirectory}
        onChange={setOutputDirectory}
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
        info="Optional. Leave empty to save beside each original file."
      />
      {(image || video) && (
        <Form.TextField
          id="quality"
          title="Quality"
          value={quality}
          onChange={setQuality}
          placeholder="Default (1–100)"
          info="Applies to lossy formats supported by Convt."
        />
      )}
      {image && (
        <Form.TextField
          id="maxSize"
          title="Maximum Image Size"
          value={maxSize}
          onChange={setMaxSize}
          placeholder="Original size"
          info="Longest edge in pixels. Smaller images are not enlarged."
        />
      )}
      {hasPdf && image && (
        <Form.TextField
          id="pages"
          title="PDF Pages"
          value={pages}
          onChange={setPages}
          placeholder="All pages"
          info="Use a page or range, such as 2, 1-3, or 4-. Each page becomes a separate file."
        />
      )}
      {(hasPdf || hasSvg) && image && (
        <Form.TextField id="dpi" title="Render DPI" value={dpi} onChange={setDpi} placeholder="Default (18–1200)" />
      )}
    </Form>
  );
}

function Results({ results }: { results: ConversionResult[] }) {
  const { pop } = useNavigation();
  const outputs = results.flatMap((result) => (result.status === "done" ? result.outputs : []));
  return (
    <List navigationTitle="Conversion Results" searchBarPlaceholder="Search converted files…">
      <List.Section title="Converted Files" subtitle={`${outputs.length} output${outputs.length === 1 ? "" : "s"}`}>
        {results.flatMap((result) =>
          result.status === "done"
            ? result.outputs.map((output) => (
                <List.Item
                  key={output}
                  title={path.basename(output)}
                  subtitle={path.dirname(output)}
                  icon={{ fileIcon: output }}
                  accessories={[
                    {
                      icon: { source: Icon.CheckCircle, tintColor: Color.Green },
                      tooltip: `Converted from ${path.basename(result.input)}`,
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.ShowInFinder
                        title={process.platform === "win32" ? "Show in File Explorer" : "Show in Finder"}
                        path={output}
                      />
                      <Action.Open title="Open Converted File" target={output} />
                      <Action.CopyToClipboard title="Copy File" content={{ file: output }} />
                      <Action.CopyToClipboard title="Copy Path" content={output} />
                      <Action.CopyToClipboard title="Copy All Output Paths" content={outputs.join("\n")} />
                      <Action title="Convert More Files" icon={Icon.ArrowCounterClockwise} onAction={pop} />
                    </ActionPanel>
                  }
                />
              ))
            : [],
        )}
      </List.Section>
      <List.Section title="Not Converted">
        {results
          .filter((result) => result.status !== "done")
          .map((result) => (
            <List.Item
              key={result.input}
              title={path.basename(result.input)}
              subtitle={result.message}
              icon={result.status === "cancelled" ? Icon.XMarkCircle : Icon.Warning}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Error"
                    target={
                      <Detail
                        markdown={`# ${result.status === "cancelled" ? "Conversion Cancelled" : "Conversion Failed"}\n\n${result.message}`}
                      />
                    }
                  />
                  <Action.CopyToClipboard title="Copy Error" content={result.message} />
                  <Action title="Back to Conversion" icon={Icon.ArrowCounterClockwise} onAction={pop} />
                  <Action.OpenInBrowser title="Open Convt Help" url="https://github.com/opencoredev/convt#engines" />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}
