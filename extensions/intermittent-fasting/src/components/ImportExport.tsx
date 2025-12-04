import { Action, ActionPanel, Form, showToast, Toast, open } from "@raycast/api";
import { EnhancedItem } from "../types";
import { useNavigation } from "@raycast/api";
import fs from "fs";
import path from "path";
import { mergeItems } from "../storage";
import { FormValidation, useForm } from "@raycast/utils";

interface StoredItem {
  id: string;
  start: string | Date;
  end: string | Date | null;
  notes?: string;
  mood?: string;
  fastingDuration?: number;
}

interface ImportExportProps {
  data?: EnhancedItem[];
  onComplete: () => Promise<EnhancedItem[]>;
  mode: "import" | "export";
}

interface FormValues {
  file: string[];
}

export default function ImportExport({ data, onComplete, mode }: ImportExportProps) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit: async (values) => {
      try {
        const filePath = values.file[0];

        if (mode === "export") {
          const fileName = `fasting-history-${new Date().toISOString().split("T")[0]}.json`;
          const fullPath = path.join(filePath, fileName);
          await fs.promises.writeFile(fullPath, JSON.stringify(data, null, 2));
          await showToast({
            style: Toast.Style.Success,
            title: "History Exported",
            message: `Saved to: ${fullPath}`,
            primaryAction: {
              title: "Open Folder",
              onAction: () => {
                open(filePath);
              },
            },
          });
        } else {
          const fileContent = await fs.promises.readFile(filePath, "utf-8");
          const parsedData = JSON.parse(fileContent);

          // Validate imported data
          if (!Array.isArray(parsedData)) {
            throw new Error("Invalid file format: expected an array");
          }

          const importedData = parsedData.filter((item): item is StoredItem => {
            return (
              typeof item === "object" &&
              item !== null &&
              typeof item.id === "string" &&
              (item.start instanceof Date || typeof item.start === "string") &&
              (item.end === null || item.end instanceof Date || typeof item.end === "string")
            );
          });

          if (importedData.length === 0) {
            throw new Error("No valid fasting records found in file");
          }

          const newItemsCount = await mergeItems(importedData as EnhancedItem[]);
          await onComplete();
          await showToast({
            style: Toast.Style.Success,
            title: "History Imported",
            message: newItemsCount > 0 ? `Added ${newItemsCount} new fasting records` : "No fasting history was added",
          });
        }

        pop();
      } catch (error) {
        console.error(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: error instanceof Error ? error.message : "An unknown error occurred",
        });
      }
    },
    validation: {
      file: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={mode === "export" ? "Export" : "Import"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title=""
        text={
          mode === "export" ? "Choose a folder to export your history to." : "Select a history file to import from."
        }
      />

      <Form.FilePicker
        {...itemProps.file}
        title="Choose Location"
        allowMultipleSelection={false}
        canChooseDirectories={mode === "export"}
        canChooseFiles={mode === "import"}
      />
    </Form>
  );
}
