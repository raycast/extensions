import { readFile, stat } from "node:fs/promises";

import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  popToRoot,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";

import type { Destination } from "../domain/destination";
import {
  type ImportConflictStrategy,
  type ImportPreview,
  buildImportPreview,
  countImportStatuses,
  detectImportFormat,
  mergeImportedDestinations,
  parseImport,
} from "../domain/import";
import { saveDestinationLibrary } from "../services/destination-library";
import { isDirectory } from "../services/filesystem";

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export interface ImportDestinationsFormProps {
  existing: readonly Destination[];
  destinationsCsvFile?: string;
  onImported: (destinations: Destination[]) => void;
}

export function ImportDestinationsForm({ existing, destinationsCsvFile, onImported }: ImportDestinationsFormProps) {
  const { push } = useNavigation();
  const [files, setFiles] = useState<string[]>([]);
  const [fileError, setFileError] = useState<string>();

  async function previewImport() {
    const filePath = files[0];
    if (!filePath) {
      setFileError("Choose a CSV or JSON file.");
      return;
    }

    try {
      const metadata = await stat(filePath);
      if (metadata.size > MAX_IMPORT_BYTES) {
        setFileError("Import files must be 5 MB or smaller.");
        return;
      }
      const content = await readFile(filePath, "utf8");
      const format = detectImportFormat(filePath, content);
      const preview = await buildImportPreview(parseImport(content, format), existing, isDirectory);
      push(
        <ImportPreviewView
          preview={preview}
          existing={existing}
          destinationsCsvFile={destinationsCsvFile}
          onImported={onImported}
        />,
      );
    } catch (error) {
      setFileError(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <Form
      navigationTitle="Import Destinations"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Preview Import" icon={Icon.Eye} onSubmit={previewImport} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="CSV or JSON"
        text="The file is parsed and validated first. Nothing is saved until you review the preview and choose an import strategy."
      />
      <Form.FilePicker
        id="import-file"
        title="Import File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
        value={files}
        error={fileError}
        onChange={(value) => {
          setFiles(value);
          setFileError(undefined);
        }}
      />
    </Form>
  );
}

interface ImportPreviewViewProps {
  preview: ImportPreview;
  existing: readonly Destination[];
  destinationsCsvFile?: string;
  onImported: (destinations: Destination[]) => void;
}

function ImportPreviewView({ preview, existing, destinationsCsvFile, onImported }: ImportPreviewViewProps) {
  const counts = countImportStatuses(preview);
  const hasImportableItems = counts.valid + counts.duplicate > 0;

  async function apply(strategy: ImportConflictStrategy) {
    const result = mergeImportedDestinations(existing, preview, strategy);
    if (result.importedCount === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No destinations are importable with this strategy" });
      return;
    }

    const confirmed = await confirmAlert({
      title: `Import ${result.importedCount} destinations?`,
      message: [
        strategy === "skip" ? "Duplicates will be skipped." : "",
        strategy === "replace" ? `${result.replacedCount} matching saved destinations will be replaced.` : "",
        `${result.skippedCount} invalid, missing, or skipped entries will not be imported.`,
      ]
        .filter(Boolean)
        .join("\n"),
      primaryAction: {
        title: "Import",
        style: strategy === "replace" ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
      },
    });
    if (!confirmed) {
      return;
    }

    try {
      await saveDestinationLibrary(result.destinations, destinationsCsvFile);
      onImported(result.destinations);
      await showToast({
        style: Toast.Style.Success,
        title: `Imported ${result.importedCount} destinations`,
        message: result.replacedCount > 0 ? `${result.replacedCount} replaced` : undefined,
      });
      popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Import failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const actions = hasImportableItems ? (
    <ActionPanel>
      <ActionPanel.Submenu title="Import Destinations" icon={Icon.Download}>
        <Action title="Skip Duplicates" onAction={() => apply("skip")} />
        <Action
          title="Replace Matching Destinations"
          style={Action.Style.Destructive}
          onAction={() => apply("replace")}
        />
      </ActionPanel.Submenu>
    </ActionPanel>
  ) : undefined;

  return (
    <List navigationTitle="Import Preview" searchBarPlaceholder="Filter preview entries" actions={actions}>
      {preview.fatalErrors.length > 0 ? (
        preview.fatalErrors.map((error, index) => (
          <List.Item
            key={`fatal-${index}`}
            title="Import File Error"
            subtitle={error}
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          />
        ))
      ) : (
        <>
          <List.Section
            title={`Valid (${counts.valid})`}
            subtitle={`${counts.duplicate} duplicates · ${counts.invalid} invalid · ${counts.missingFolder} missing folders`}
          >
            {preview.items
              .filter((item) => item.status === "valid")
              .map((item) => (
                <PreviewItem key={item.sourceIndex} item={item} actions={actions} />
              ))}
          </List.Section>
          <List.Section title={`Duplicates (${counts.duplicate})`}>
            {preview.items
              .filter((item) => item.status === "duplicate")
              .map((item) => (
                <PreviewItem key={item.sourceIndex} item={item} actions={actions} />
              ))}
          </List.Section>
          <List.Section title={`Missing Folders (${counts.missingFolder})`}>
            {preview.items
              .filter((item) => item.status === "missing-folder")
              .map((item) => (
                <PreviewItem key={item.sourceIndex} item={item} actions={actions} />
              ))}
          </List.Section>
          <List.Section title={`Invalid (${counts.invalid})`}>
            {preview.items
              .filter((item) => item.status === "invalid")
              .map((item) => (
                <PreviewItem key={item.sourceIndex} item={item} actions={actions} />
              ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

function PreviewItem({ item, actions }: { item: ImportPreview["items"][number]; actions: React.ReactNode }) {
  const icon =
    item.status === "valid"
      ? { source: Icon.CheckCircle, tintColor: Color.Green }
      : item.status === "duplicate"
        ? { source: Icon.Duplicate, tintColor: Color.Yellow }
        : { source: Icon.ExclamationMark, tintColor: Color.Red };

  return (
    <List.Item
      title={item.destination?.name || item.sourceLabel}
      subtitle={item.destination?.path || item.messages.join(" ")}
      accessories={[
        { text: item.sourceLabel },
        ...(item.messages[0] ? [{ tooltip: item.messages[0], icon: Icon.Info }] : []),
      ]}
      keywords={[item.sourceLabel, item.destination?.path ?? "", ...item.messages]}
      icon={icon}
      actions={actions}
    />
  );
}
