import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { generateCSV } from "../utils/csv";
import { AppliedRole } from "../utils/applications";

/**
 * Props for the ExportCSVCommand component.
 * - data: The current list of AppliedRole entries to export.
 */
type Props = { data: AppliedRole[] };

/**
 * Internal form values for the export form.
 * - filename: Desired CSV file name. If missing ".csv", the extension is appended automatically.
 * - folder_path: A single-element array containing the destination folder path selected by the user.
 */
type FormValues = {
  filename: string;
  folder_path: string[];
};

/**
 * ExportCSVCommand
 *
 * Renders a form that allows users to export their applications to a CSV file.
 * Behavior:
 * - Validates that both the filename and destination folder are provided.
 * - Ensures the filename ends with ".csv".
 * - Calls generateCSV to write a CSV using the provided data and selected folder.
 * - Shows a success or failure toast upon completion.
 *
 * UI:
 * - Primary action: "Export as Spreadsheet" (Cmd+E).
 * - Quick actions: Reset form (Cmd+Backspace), Copy File Name (Cmd+C), and Open Destination Folder (Cmd+O).
 *
 * Notes:
 * - The export logic (escaping, formatting, etc.) lives in utils/csv.generateCSV.
 * - The Form.FilePicker only allows choosing directories for the destination.
 */
export default function ExportCSVCommand({ data }: Props) {
  const { handleSubmit, itemProps, reset } = useForm<FormValues>({
    onSubmit(values) {
      const filename = values.filename.endsWith(".csv") ? values.filename : `${values.filename}.csv`;
      const error = generateCSV(data, values.folder_path[0], filename);
      if (error) {
        showToast({ style: Toast.Style.Failure, title: "Export Failed", message: error.message });
      } else {
        showToast({
          style: Toast.Style.Success,
          title: "Exported Successfully",
          message: `Saved to ${values.folder_path[0]}`,
        });
      }
    },
    validation: {
      filename: FormValidation.Required,
      folder_path: FormValidation.Required,
    },
    initialValues: {
      filename: "saved_applications.csv",
    },
  });

  return (
    <Form
      navigationTitle="Export Applications as CSV"
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Export">
            <Action.SubmitForm
              title="Export as Spreadsheet"
              icon={Icon.Upload}
              onSubmit={handleSubmit}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Quick Actions">
            <Action
              title="Reset Form"
              icon={Icon.ArrowCounterClockwise}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              onAction={reset}
            />
            <Action.CopyToClipboard
              title="Copy File Name"
              content={itemProps.filename.value ?? ""}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.Open
              title="Open Destination Folder"
              icon={Icon.Folder}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              target={itemProps.folder_path.value ? itemProps.folder_path.value[0] : ""}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description text={"                           Export Applications to CSV"} />
      <Form.TextField title="File Name" placeholder="saved_applications.csv" {...itemProps.filename} />
      <Form.FilePicker
        canChooseFiles={false}
        canChooseDirectories
        allowMultipleSelection={false}
        title="Destination Folder"
        {...itemProps.folder_path}
        info="We’ll save a .csv file in the selected folder. If the name doesn’t end with .csv, we’ll add it for you."
      />
      <Form.Description text={`You’re exporting ${data.length} application${data.length === 1 ? "" : "s"}.`} />
    </Form>
  );
}
