import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { t } from "../utils/i18n";
import { importFoldersJSON } from "../utils/storage";

interface ImportBackupFormProps {
  onImported: () => unknown | Promise<unknown>;
}

interface ImportBackupValues {
  jsonText: string;
  mode: string;
}

/**
 * Form for restoring folders from JSON backup data using useForm and FormValidation.
 */
export function ImportBackupForm({ onImported }: ImportBackupFormProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<ImportBackupValues>({
    async onSubmit(values) {
      try {
        const resolvedMode = values.mode === "replace" ? "replace" : "merge";
        const importedCount = await importFoldersJSON(
          values.jsonText,
          resolvedMode,
        );
        await showToast({
          style: Toast.Style.Success,
          title: t.importSuccessTitle,
          message: t.importSuccessMessage(importedCount),
        });
        await onImported();
        pop();
      } catch (err) {
        await showFailureToast(err, { title: t.errorTitle });
      }
    },
    validation: {
      jsonText: FormValidation.Required,
    },
    initialValues: {
      jsonText: "",
      mode: "merge",
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t.importSubmit}
            icon={Icon.Upload}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={t.importBackupDesc} />

      <Form.TextArea
        {...itemProps.jsonText}
        title={t.importJsonField}
        placeholder={t.importJsonPlaceholder}
      />

      <Form.Dropdown {...itemProps.mode} title={t.importMode}>
        <Form.Dropdown.Item
          value="merge"
          title={t.importModeMerge}
          icon={Icon.PlusCircle}
        />
        <Form.Dropdown.Item
          value="replace"
          title={t.importModeReplace}
          icon={Icon.ExclamationMark}
        />
      </Form.Dropdown>
    </Form>
  );
}
