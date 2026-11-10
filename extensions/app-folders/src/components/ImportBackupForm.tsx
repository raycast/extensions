import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { t } from "../utils/i18n";
import { importFoldersJSON } from "../utils/storage";

interface ImportBackupFormProps {
  onImported: () => unknown | Promise<unknown>;
}

/**
 * Form for restoring folders from JSON backup data.
 */
export function ImportBackupForm({ onImported }: ImportBackupFormProps) {
  const { pop } = useNavigation();
  const [jsonText, setJsonText] = useState("");
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit() {
    if (!jsonText.trim()) {
      setError(t.importErrorInvalidJson);
      return;
    }

    try {
      const importedCount = await importFoldersJSON(jsonText, mode);
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
  }

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
        id="jsonText"
        title={t.importJsonField}
        placeholder={t.importJsonPlaceholder}
        value={jsonText}
        error={error}
        onChange={(val) => {
          setJsonText(val);
          if (error) setError(undefined);
        }}
      />

      <Form.Dropdown
        id="mode"
        title={t.importMode}
        value={mode}
        onChange={(val) => setMode(val as "merge" | "replace")}
      >
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
