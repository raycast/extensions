import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { importCSV } from "../utils/csv";

/**
 * Internal form values for the CSV import flow.
 * - file: Single-selection array containing the absolute path to the CSV file to import.
 * - onlyNewer: If true (default), only update when the CSV row is newer.
 * - allowNoTimestamp: If true, allow updates when CSV row lacks a timestamp (treat as newer).
 * - forceOverwrite: If true, overwrite conflicts regardless of timestamps (overrides other toggles).
 */
type FormValues = {
  file: string[];
  onlyNewer: boolean;
  allowNoTimestamp: boolean;
  forceOverwrite: boolean;
};

/**
 * Props for ImportCSVCommand.
 * - onComplete: Optional callback invoked after a successful import; useful for refreshing parent lists.
 */
type Props = {
  onComplete?: (result: {
    imported: number;
    updated: number;
    skipped: number;
    errors: string[];
    skippedOlder?: number;
    skippedNoTimestamp?: number;
  }) => void;
};

/**
 * ImportCSVCommand
 *
 * Presents a form to select and import a CSV file of applications.
 * Adds conflict resolution toggles:
 * - Only update if newer (default ON)
 * - Allow updates without timestamp (default OFF)
 * - Force overwrite conflicts (default OFF)
 *
 * On success, shows a summary toast, calls onComplete, and navigates back.
 */
export default function ImportCSVCommand({ onComplete }: Props) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps, reset } = useForm<FormValues>({
    onSubmit: async (values) => {
      const filePath = values.file?.[0];
      if (!filePath) {
        await showToast({ style: Toast.Style.Failure, title: "No file selected" });
        return;
      }
      try {
        const res = await importCSV(filePath, {
          onlyUpdateIfNewer: values.onlyNewer,
          allowNoTimestamp: values.allowNoTimestamp,
          forceOverwrite: values.forceOverwrite,
        });

        const message = [`${res.imported} imported`, `${res.updated} updated`, `${res.skipped} skipped`].join(" • ");

        await showToast({ style: Toast.Style.Success, title: "Import Completed", message });
        onComplete?.(res);
        pop();
      } catch (e) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Import Failed",
          message: e instanceof Error ? e.message : "Invalid CSV",
        });
      }
    },
    validation: {
      file: FormValidation.Required,
    },
    initialValues: {
      onlyNewer: true,
      allowNoTimestamp: false,
      forceOverwrite: false,
    },
  });

  return (
    <Form
      navigationTitle="Import Applications from CSV"
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Import">
            <Action.SubmitForm
              title="Import from Spreadsheet"
              icon={Icon.Download}
              onSubmit={handleSubmit}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Quick Actions">
            <Action
              title="Reset Form"
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              icon={Icon.ArrowCounterClockwise}
              onAction={reset}
            />
            <Action.CopyToClipboard
              title="Copy File Path"
              content={itemProps.file.value?.[0] ?? ""}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.Open
              title="Open Selected File"
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              target={itemProps.file.value?.[0] ?? ""}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description text={"                           Import Applications as CSV"} />
      <Form.FilePicker
        title="Choose CSV File"
        canChooseDirectories={false}
        allowMultipleSelection={false}
        {...itemProps.file}
        info="Import your applications from a CSV file. Use a spreadsheet you previously exported from this extension, or export your current applications first to use as a template."
      />
      <Form.Checkbox
        label="Only update newer entries"
        info="Recommended. If your local entry is newer than the CSV row, it will not be updated."
        {...itemProps.onlyNewer}
      />
      <Form.Checkbox
        title={"Advanced Settings"}
        label="Treat missing dates as newer"
        info="When enabled, rows without dates are treated as newer (only applies if 'Only update newer entries' is enabled)."
        {...itemProps.allowNoTimestamp}
      />
      <Form.Checkbox
        label="Overwrite existing data (ignore dates)"
        info="Always replace your local data with CSV rows, ignoring dates. Overrides the options above."
        {...itemProps.forceOverwrite}
      />
    </Form>
  );
}
