import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { homedir } from "node:os";

import {
  exportToDirectory,
  formatError,
  useTagColors,
  useTextReplacements,
} from "./command-utils";

const DEFAULT_EXPORT_FILE_NAME = "text-replacements.json";

interface ExportFormValues {
  directory: string[];
  fileName: string;
}

export default function Command() {
  const { replacements, isLoading, error, reload } = useTextReplacements();
  const { tagColors } = useTagColors(replacements);
  const { handleSubmit, itemProps } = useForm<ExportFormValues>({
    initialValues: {
      directory: [`${homedir()}/Desktop`],
      fileName: DEFAULT_EXPORT_FILE_NAME,
    },
    validation: {
      directory: (value) => {
        if (value?.length !== 1) {
          return "Choose one folder.";
        }
      },
      fileName: (value) => {
        if (!value?.trim()) {
          return "Enter a file name.";
        }
      },
    },
    async onSubmit(values) {
      try {
        await exportToDirectory(
          replacements,
          values.directory[0],
          values.fileName,
          tagColors,
        );
      } catch (caught) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Export failed",
          message: formatError(caught),
        });
      }
    },
  });

  if (error) {
    return (
      <Detail
        markdown={`# Unable to Read Text Replacements\n\n${error}`}
        actions={
          <ActionPanel>
            <Action
              icon={Icon.ArrowClockwise}
              title="Reload from macOS"
              onAction={reload}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Export Text Replacements"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Download}
            title="Export JSON"
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onSubmit={handleSubmit}
          />
          <Action
            icon={Icon.ArrowClockwise}
            title="Reload from macOS"
            onAction={reload}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        title="Save Folder"
        allowMultipleSelection={false}
        canChooseFiles={false}
        canChooseDirectories
        {...itemProps.directory}
      />
      <Form.TextField title="File Name" {...itemProps.fileName} />
    </Form>
  );
}
