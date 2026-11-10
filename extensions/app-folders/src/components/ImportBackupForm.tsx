import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { t } from "../utils/i18n";
import { importFoldersJSON } from "../utils/storage";

interface ImportBackupFormProps {
  onImported: () => void | Promise<void>;
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
      const result = await importFoldersJSON(jsonText, mode);
      if (result.success) {
        await showToast({
          style: Toast.Style.Success,
          title: t.importSuccessTitle,
          message: t.importSuccessMessage(result.count),
        });
        await onImported();
        pop();
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: t.errorTitle,
          message: result.error || t.importErrorInvalidJson,
        });
      }
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: t.errorTitle,
        message: t.importErrorInvalidJson,
      });
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
