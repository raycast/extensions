import { Action, ActionPanel, Form, showHUD, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback, useState } from "react";
import { importRadios } from "../lib/radioImportExport";
import { createLog } from "../lib/debug";

const log = createLog("RadiosImportForm");

interface RadiosImportFormProps {
  onSubmitSuccess?: () => void;
}

export function RadiosImportForm({ onSubmitSuccess }: RadiosImportFormProps) {
  const { pop } = useNavigation();
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [fileError, setFileError] = useState<string | undefined>(undefined);

  const onSubmit = useCallback(async () => {
    const filePath = filePaths[0];

    if (!filePath) {
      setFileError("Select a JSON file to import");

      return;
    }

    setFileError(undefined);

    try {
      log.log(`Importing radios from: ${filePath}`);

      const { imported, skippedDuplicates, skippedInvalid } = await importRadios(filePath);
      const skipped = skippedDuplicates + skippedInvalid;
      const skippedDetails = [
        skippedDuplicates > 0 ? `${skippedDuplicates} duplicate${skippedDuplicates === 1 ? "" : "s"}` : null,
        skippedInvalid > 0 ? `${skippedInvalid} invalid${skippedInvalid === 1 ? "" : "s"}` : null,
      ]
        .filter(Boolean)
        .join(", ");

      showHUD(
        imported > 0
          ? `Imported ${imported} radio station${imported === 1 ? "" : "s"}${
              skipped > 0 ? `, skipped ${skipped} (${skippedDetails})` : ""
            }`
          : `No new radio stations imported${skipped > 0 ? `, skipped ${skipped} (${skippedDetails})` : ""}`,
      );

      onSubmitSuccess?.();
      pop();
    } catch (error) {
      log.error(`Failed to import radios: ${error}`);
      showToast({ title: "Failed to import radios", message: String(error), style: Toast.Style.Failure });
    }
  }, [filePaths, onSubmitSuccess]);

  return (
    <Form
      navigationTitle="Import Radios"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Radios" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title="JSON file"
        info="Radio stations exported from AudioCast Control as a JSON file"
        canChooseFiles
        canChooseDirectories={false}
        allowMultipleSelection={false}
        value={filePaths}
        error={fileError}
        onChange={setFilePaths}
      />
    </Form>
  );
}
