import { Action, ActionPanel, Detail, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { homedir } from "node:os";
import { join } from "node:path";
import { exportMigration, validateFilename, type ExportMode } from "../lib/exporter";
import type { MigrationSession } from "../lib/types";
import { textPreview } from "./shared";

export function ExportForm({ session, reportOnly = false }: { session: MigrationSession; reportOnly?: boolean }) {
  const { push } = useNavigation();
  const [directories, setDirectories] = useState([join(homedir(), "Downloads")]);
  const [filename, setFilename] = useState(
    `migration-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}.json`,
  );
  const [mode, setMode] = useState<ExportMode>(reportOnly ? "report" : "single");
  const [directoryError, setDirectoryError] = useState<string>();
  const [filenameError, setFilenameError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  async function save(values: { includeReport: boolean }) {
    if (isLoading) return;
    const directory = directories[0];
    const invalidFilename = validateFilename(filename);
    setDirectoryError(directory ? undefined : "Choose an output folder.");
    setFilenameError(invalidFilename);
    if (!directory || invalidFilename) return;
    setIsLoading(true);
    try {
      const result = await exportMigration({ directory, filename, mode, includeReport: values.includeReport, session });
      await showToast({
        style: Toast.Style.Success,
        title: mode === "report" ? "Migration Report Saved" : `Exported ${result.count} Snippets`,
      });
      push(<ExportComplete result={result} />);
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Save Export" });
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <Form
      navigationTitle="Export Migration"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Export" icon={Icon.Download} onSubmit={save} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`${session.selectedIds.length} snippets selected across all groups. Exports use private permissions and never overwrite existing files or folders.`}
      />
      <Form.Dropdown
        id="mode"
        title="Export"
        value={mode}
        onChange={(value) => {
          if (value === "single" || value === "groups" || value === "report") setMode(value);
        }}
      >
        <Form.Dropdown.Item value="single" title="One JSON File" />
        <Form.Dropdown.Item value="groups" title="Separate JSON File for Each Group" />
        <Form.Dropdown.Item value="report" title="Migration Report Only" />
      </Form.Dropdown>
      <Form.FilePicker
        id="directory"
        title="Save To"
        value={directories}
        onChange={(value) => {
          setDirectories(value);
          setDirectoryError(undefined);
        }}
        error={directoryError}
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
      />
      <Form.TextField
        id="filename"
        title={mode === "groups" ? "Base Filename" : "Filename"}
        placeholder="my-snippets.json"
        value={filename}
        onChange={(value) => {
          setFilename(value);
          setFilenameError(undefined);
        }}
        error={filenameError}
        info={
          mode === "groups"
            ? "Creates a new folder ending in -groups, containing numbered group files."
            : "Use a filename ending in .json."
        }
      />
      {mode !== "report" && (
        <Form.Checkbox
          id="includeReport"
          title="Report"
          label="Include a migration report"
          defaultValue
          info="Reports list names, keywords, sources, changes, and exclusion reasons. Snippet bodies are omitted."
        />
      )}
      {mode === "report" && (
        <Form.Description text="This saves a report, not an importable snippet file. Selected snippets are recorded as selected rather than exported." />
      )}
    </Form>
  );
}

function ExportComplete({ result }: { result: Awaited<ReturnType<typeof exportMigration>> }) {
  const snippets = result.paths.filter((path) => path !== result.reportPath);
  const reveal = result.directory ?? result.paths[0];
  return (
    <Detail
      navigationTitle="Migration Exported"
      markdown={`## ${result.count ? `${result.count} snippets exported` : "Migration report saved"}\n\n${snippets.length ? "Run **Import Snippets** in Raycast and select a snippet JSON file below. For separate group files, import each file.\n\n" : ""}${snippets.map((path) => textPreview(path)).join("\n\n")}${result.reportPath ? `\n\n### Migration report\n\nThis file is for review and cannot be imported as snippets.\n\n${textPreview(result.reportPath)}` : ""}`}
      actions={
        <ActionPanel>
          {reveal && <Action.ShowInFinder title="Show Export in Finder" path={reveal} />}
          {snippets.map((path, index) => (
            <Action.CopyToClipboard key={path} title={`Copy Snippet File Path ${index + 1}`} content={path} />
          ))}
          {result.reportPath && <Action.ShowInFinder title="Show Migration Report" path={result.reportPath} />}
          <Action.OpenInBrowser title="Raycast Snippet Import Help" url="https://manual.raycast.com/snippets" />
        </ActionPanel>
      }
    />
  );
}
