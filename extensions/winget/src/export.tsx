/**
 * Export Packages: writes the winget package manifest. Fast and bounded, so
 * it runs in-view (Lane A) — instant feedback, no pop to root.
 */

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";

import { Action, ActionPanel, Form, popToRoot } from "@raycast/api";
import { useState } from "react";

import { operationTitle } from "./core/feedback";
import { applyPreferences } from "./core/prefs";
import { useOperation } from "./hooks/useOperation";

interface ExportFormValues {
  folder: string[];
  fileName: string;
  includeVersions: boolean;
}

export default function ExportPackages() {
  applyPreferences();
  const { runInline } = useOperation();
  const [fileNameError, setFileNameError] = useState<string | undefined>();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Export"
            onSubmit={async (values: ExportFormValues) => {
              const folder = values.folder?.[0] ?? join(homedir(), "Desktop");
              const fileName = values.fileName.trim() || "winget-packages.json";
              if (!isAbsolute(folder) || !existsSync(folder)) {
                setFileNameError("Choose an existing folder");
                return;
              }
              const outputPath = join(folder, fileName.endsWith(".json") ? fileName : `${fileName}.json`);
              if (existsSync(outputPath)) {
                setFileNameError("File already exists, pick another name");
                return;
              }
              const outcome = await runInline({
                kind: "export",
                title: operationTitle("export"),
                outputPath,
                includeVersions: values.includeVersions,
              });
              // Stay in the form on busy-rejection or failure (the toast
              // explains); leave only when the export actually happened.
              if (outcome?.status === "succeeded") {
                await popToRoot();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title="Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        defaultValue={[join(homedir(), "Desktop")]}
      />
      <Form.TextField
        id="fileName"
        title="File Name"
        defaultValue="winget-packages.json"
        error={fileNameError}
        onChange={() => setFileNameError(undefined)}
      />
      <Form.Checkbox
        id="includeVersions"
        label="Include Versions"
        defaultValue={false}
        info="Pin exported packages to their currently installed versions"
      />
    </Form>
  );
}
