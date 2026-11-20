import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  getPreferenceValues,
  Icon,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useForm, usePromise } from "@raycast/utils";
import { createReadStream } from "fs";
import { basename, dirname } from "path";
import { useState } from "react";
import { buffer } from "stream/consumers";
import { formatFileSize, listLogFiles, LogFile } from "./lib/log-files";
import { buildMatcher, codeBlock, MatchMode, parseLogFile, ParseOptions, ParseResult } from "./lib/parse";

interface FormValues {
  searchQuery: string;
  matchMode: MatchMode;
  caseSensitive: boolean;
  includeLineNumbers: boolean;
  otherFile?: string[];
}

const MAX_CLIPBOARD_BYTES = 10_000_000;
const relativeTime = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

function formatAge(date: Date): string {
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["second", 60],
    ["minute", 60],
    ["hour", 24],
    ["day", 30],
    ["month", 12],
  ];
  let value = seconds;
  for (const [unit, size] of steps) {
    if (Math.abs(value) < size) return relativeTime.format(value, unit);
    value = Math.round(value / size);
  }
  return relativeTime.format(value, "year");
}

function logFileTitle(file: LogFile): string {
  return `${file.name}  (${formatAge(file.modified)}, ${formatFileSize(file.size)})`;
}

/** Returns an error message for the query, or undefined when it is usable. */
function validateQuery(query: string, mode: MatchMode): string | undefined {
  if (!query.trim()) return "Enter something to search for";
  try {
    buildMatcher({ query, mode, caseSensitive: false });
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  return undefined;
}

export default function Command() {
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences.ParseLogFile>();
  const [matchMode, setMatchMode] = useState<MatchMode>("contains");
  const [logFileError, setLogFileError] = useState<string | undefined>();
  const [selectedLogPath, setSelectedLogPath] = useState<string>();
  const [otherFile, setOtherFile] = useState<string[]>([]);

  const {
    data: logFiles,
    isLoading,
    error: listError,
    revalidate,
  } = usePromise(listLogFiles, [preferences.defaultFolderPath, preferences.fileExtensions]);
  const logFile = logFiles?.find((file) => file.path === selectedLogPath) ?? logFiles?.[0];

  async function parseLogs(values: FormValues) {
    const sourceFile = values.otherFile?.[0] ?? (listError ? undefined : logFile?.path);
    if (!sourceFile) {
      if (!listError && !isLoading) setLogFileError("No matching files. Choose a file below or reload the list.");
      return;
    }

    const options: ParseOptions = {
      query: values.searchQuery,
      mode: values.matchMode,
      caseSensitive: values.caseSensitive,
      includeLineNumbers: values.includeLineNumbers,
    };

    const toast = await showToast({ style: Toast.Style.Animated, title: `Parsing ${basename(sourceFile)}…` });

    try {
      const result = await parseLogFile(sourceFile, options, preferences.outputFolderPath || undefined);

      if (!result.outputFile) {
        toast.style = Toast.Style.Failure;
        toast.title = "No matches";
        toast.message = `None of the ${result.linesScanned.toLocaleString()} lines in ${basename(sourceFile)} match "${values.searchQuery}"`;
        return;
      }

      toast.style = Toast.Style.Success;
      toast.title = `Found ${result.matchCount.toLocaleString()} matching line${result.matchCount === 1 ? "" : "s"}`;
      toast.message = result.outputFallbackReason;

      push(<LogResultView result={result} options={options} outputFile={result.outputFile} />);
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "Failed to parse log" });
    }
  }

  const { handleSubmit, itemProps, setValidationError } = useForm<FormValues>({
    onSubmit: parseLogs,
    initialValues: { searchQuery: preferences.defaultSearchQuery ?? "" },
    validation: { searchQuery: (query) => validateQuery(query ?? "", matchMode) },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Parse Logs" icon={Icon.MagnifyingGlass} onSubmit={handleSubmit} />
          <Action
            title="Reload Log Files"
            icon={Icon.ArrowClockwise}
            onAction={() => {
              setLogFileError(undefined);
              revalidate();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Search Query"
        placeholder={matchMode === "regex" ? "e.g. ERROR|WARN" : "Text to find in the log"}
        {...itemProps.searchQuery}
      />
      <Form.Dropdown
        id="matchMode"
        title="Match"
        value={matchMode}
        onChange={(value) => {
          if (value === "contains" || value === "regex") setMatchMode(value);
          setValidationError("searchQuery", undefined);
        }}
      >
        <Form.Dropdown.Item value="contains" title="Lines containing the text" icon={Icon.Text} />
        <Form.Dropdown.Item value="regex" title="Lines matching a regular expression" icon={Icon.Code} />
      </Form.Dropdown>
      <Form.Checkbox id="caseSensitive" label="Case sensitive" defaultValue={false} storeValue />
      <Form.Checkbox id="includeLineNumbers" label="Include original line numbers" defaultValue={false} storeValue />

      <Form.Separator />

      {otherFile.length > 0 ? (
        <Form.Description title="Log File" text={`Using ${basename(otherFile[0])}`} />
      ) : listError ? (
        <Form.Description title="Log File" text={listError.message} />
      ) : (
        <Form.Dropdown
          id="logFile"
          title="Log File"
          info="Newest first. Files this extension created are left out."
          value={logFile?.path ?? ""}
          error={logFileError}
          onChange={setSelectedLogPath}
        >
          {(logFiles ?? []).map((file) => (
            <Form.Dropdown.Item key={file.path} value={file.path} title={logFileTitle(file)} icon={Icon.Document} />
          ))}
        </Form.Dropdown>
      )}
      <Form.FilePicker
        id="otherFile"
        title="Or Choose a File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
        value={otherFile}
        onChange={setOtherFile}
      />
    </Form>
  );
}

function LogResultView({
  result,
  options,
  outputFile,
}: {
  result: ParseResult;
  options: ParseOptions;
  outputFile: string;
}) {
  const summary = `${result.matchCount.toLocaleString()} matching line${result.matchCount === 1 ? "" : "s"}.`;
  const cutoff = result.previewTruncated ? " Preview shortened. Open the file for the full results." : "";
  const markdown = `${summary}${cutoff}\n\n${codeBlock(result.preview.join("\n"))}\n`;

  const matchDescription = `${options.mode === "regex" ? "Regular expression" : "Contains text"}, ${
    options.caseSensitive ? "case sensitive" : "ignoring case"
  }`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Log Parse Results"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Search Query" text={options.query} />
          <Detail.Metadata.Label title="Match" text={matchDescription} />
          <Detail.Metadata.Label title="Matches Found" text={result.matchCount.toLocaleString()} />
          <Detail.Metadata.Label title="Lines Scanned" text={result.linesScanned.toLocaleString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Original File" text={basename(result.sourceFile)} />
          <Detail.Metadata.Label title="New File" text={basename(outputFile)} />
          <Detail.Metadata.Label title="Saved In" text={dirname(outputFile)} />
          {result.outputFallbackReason && (
            <Detail.Metadata.Label title="Note" text={result.outputFallbackReason} icon={Icon.Warning} />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy File"
              content={{ file: outputFile }}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action
              title="Copy File Contents"
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={async () => {
                try {
                  // The stream's end is inclusive, so this reads at most one byte over the limit.
                  const contents = await buffer(createReadStream(outputFile, { end: MAX_CLIPBOARD_BYTES }));
                  if (contents.length > MAX_CLIPBOARD_BYTES) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Results Exceed 10 MB",
                      message: "Use Copy File to copy the full results as a file.",
                    });
                    return;
                  }
                  await Clipboard.copy(contents.toString("utf8"));
                  await showHUD("File contents copied to clipboard");
                } catch (error) {
                  await showFailureToast(error, { title: "Failed to copy file contents" });
                }
              }}
            />
            <Action.CopyToClipboard
              title="Copy File Name"
              content={basename(outputFile)}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action.CopyToClipboard
              title="Copy File Path"
              content={outputFile}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="File">
            <Action.Open title="Open File" target={outputFile} />
            <Action.ShowInFinder path={outputFile} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
