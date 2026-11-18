/**
 * Import Packages: installs packages from a winget manifest. Potentially a
 * long multi-install run, so it executes in the detached runner (Lane B).
 */

import { existsSync } from "node:fs";

import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";

import { operationTitle } from "./core/feedback";
import { applyPreferences } from "./core/prefs";
import { useOperation } from "./hooks/useOperation";

interface ImportFormValues {
  inputFile: string[];
  ignoreUnavailable: boolean;
  ignoreVersions: boolean;
  noUpgrade: boolean;
}

export default function ImportPackages() {
  applyPreferences();
  const { launchDetached } = useOperation();
  const [fileError, setFileError] = useState<string | undefined>();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Import"
            onSubmit={async (values: ImportFormValues) => {
              const filePath = values.inputFile?.[0];
              if (!filePath || !existsSync(filePath)) {
                setFileError("Choose a winget export file");
                return;
              }
              if (!filePath.toLowerCase().endsWith(".json")) {
                setFileError("winget exports are .json files");
                return;
              }
              // The launch pops to root itself; progress continues in the toast.
              await launchDetached({
                kind: "import",
                title: operationTitle("import"),
                inputPath: filePath,
                ignoreUnavailable: values.ignoreUnavailable,
                ignoreVersions: values.ignoreVersions,
                noUpgrade: values.noUpgrade,
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="inputFile"
        title="Package File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        error={fileError}
        onChange={() => setFileError(undefined)}
      />
      <Form.Checkbox
        id="ignoreUnavailable"
        label="Ignore Unavailable"
        defaultValue={false}
        info="Skip packages that are not available in any source"
      />
      <Form.Checkbox
        id="ignoreVersions"
        label="Ignore Versions"
        defaultValue={false}
        info="Install the latest version instead of the version in the file"
      />
      <Form.Checkbox
        id="noUpgrade"
        label="Skip Upgrades"
        defaultValue={false}
        info="Skip already installed packages even if an update is available"
      />
    </Form>
  );
}
