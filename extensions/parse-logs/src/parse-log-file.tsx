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
import { usePromise } from "@raycast/utils";
import { readFile } from "fs/promises";
import { basename, dirname } from "path";
import { useState } from "react";
import { formatFileSize, listLogFiles, LogFile } from "./lib/log-files";
import { buildMatcher, codeBlock, MatchMode, parseLogFile, ParseOptions, ParseResult } from "./lib/parse";

interface FormValues {
  searchQuery: string;
  matchMode: MatchMode;
  caseSensitive: boolean;
  includeLineNumbers: boolean;
  logFile?: string;
  otherFile?: string[];
}

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
  const [queryError, setQueryError] = useState<string | undefined>();
  const [otherFile, setOtherFile] = useState<string[]>([]);

  const {
    data: logFiles,
    isLoading,
    error: listError,
  } = usePromise(listLogFiles, [preferences.defaultFolderPath, preferences.fileExtensions]);

  async function handleSubmit(values: FormValues) {
    const error = validateQuery(values.searchQuery, values.matchMode);
    if (error) {
      setQueryError(error);
      return;
    }

    const sourceFile = values.otherFile?.[0] ?? values.logFile;
    if (!sourceFile) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No log file to parse",
        message: `No matching files in ${preferences.defaultFolderPath}. Choose a file instead.`,
      });
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

      if (result.matchCount === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "No matches";
        toast.message = `None of the ${result.linesScanned.toLocaleString()} lines in ${basename(sourceFile)} match "${values.searchQuery}"`;
        return;
      }

      toast.style = Toast.Style.Success;
      toast.title = `Found ${result.matchCount.toLocaleString()} matching line${result.matchCount === 1 ? "" : "s"}`;
      toast.message = result.outputFallbackReason;

      push(<LogResultView result={result} options={options} />);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to parse log";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Parse Logs" icon={Icon.MagnifyingGlass} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="searchQuery"
        title="Search Query"
        placeholder={matchMode === "regex" ? "e.g. ERROR|WARN" : "Text to find in the log"}
        defaultValue={preferences.defaultSearchQuery || ""}
        error={queryError}
        onChange={() => setQueryError(undefined)}
        onBlur={(event) => {
          const value = String(event.target.value ?? "");
          if (value) setQueryError(validateQuery(value, matchMode));
        }}
      />
      <Form.Dropdown
        id="matchMode"
        title="Match"
        value={matchMode}
        onChange={(value) => {
          setMatchMode(value as MatchMode);
          setQueryError(undefined);
        }}
      >
        <Form.Dropdown.Item value="contains" title="Lines containing the text" icon={Icon.Text} />
        <Form.Dropdown.Item value="regex" title="Lines matching a regular expression" icon={Icon.Code} />
      </Form.Dropdown>
      <Form.Checkbox id="caseSensitive" label="Case sensitive" defaultValue={false} storeValue />
      <Form.Checkbox id="includeLineNumbers" label="Include original line numbers" defaultValue={false} storeValue />

      <Form.Separator />

      {listError ? (
        <Form.Description title="Log File" text={listError.message} />
      ) : otherFile.length === 0 ? (
        <Form.Dropdown id="logFile" title="Log File" info="Newest first. Files this extension created are left out.">
          {(logFiles ?? []).map((file) => (
            <Form.Dropdown.Item key={file.path} value={file.path} title={logFileTitle(file)} icon={Icon.Document} />
          ))}
        </Form.Dropdown>
      ) : (
        <Form.Description title="Log File" text={`Using ${basename(otherFile[0])}`} />
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

function LogResultView({ result, options }: { result: ParseResult; options: ParseOptions }) {
  // The result view is only shown when something matched, so a file was written.
  const outputFile = result.outputFile as string;

  const shown = result.preview.length;
  const summary = result.previewTruncated
    ? `Showing the first ${shown.toLocaleString()} of ${result.matchCount.toLocaleString()} matching lines. Open the file to see them all.`
    : `${result.matchCount.toLocaleString()} matching line${result.matchCount === 1 ? "" : "s"}.`;

  const markdown = `${summary}\n\n${codeBlock(result.preview.join("\n"))}\n`;

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
          <ActionPanel.Section title="File">
            <Action.Open title="Open File" target={outputFile} />
            <Action.ShowInFinder path={outputFile} />
          </ActionPanel.Section>
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
                  await Clipboard.copy(await readFile(outputFile, "utf8"));
                  await showHUD("File contents copied to clipboard");
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to copy file contents",
                    message: error instanceof Error ? error.message : String(error),
                  });
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
        </ActionPanel>
      }
    />
  );
}
