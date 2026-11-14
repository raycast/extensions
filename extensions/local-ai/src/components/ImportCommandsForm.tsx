import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { useState } from "react";
import { useCommands } from "../hooks/useCommands";
import { ImportError, parseImport } from "../lib/commands/transfer";
import { getSettings } from "../services/settings";

export function ImportCommandsForm() {
  const { pop } = useNavigation();
  const { commands, mutate } = useCommands();
  const [fileError, setFileError] = useState<string>();

  async function submit(values: { files: string[] }) {
    const path = values.files[0];
    if (!path) {
      setFileError("Choose a file to import");
      return;
    }
    try {
      const settings = getSettings();
      const report = parseImport(await readFile(path, "utf8"), {
        existingIds: new Set(commands.map((command) => command.id)),
        validIconNames: new Set(Object.keys(Icon)),
        newId: randomUUID,
        now: new Date().toISOString(),
        defaults: { model: settings.defaultModel, creativity: settings.defaultCreativity },
      });
      if (!(await mutate((current) => [...current, ...report.imported]))) return;
      const skipped = report.skipped.length;
      await showToast({
        style: skipped > 0 ? Toast.Style.Failure : Toast.Style.Success,
        title: `Imported ${report.imported.length} ${report.imported.length === 1 ? "command" : "commands"}`,
        message:
          skipped > 0
            ? `Skipped ${skipped}: ${report.skipped.map((item) => `#${item.index + 1} ${item.reason}`).join("; ")}`
            : undefined,
      });
      pop();
    } catch (error) {
      if (error instanceof ImportError) setFileError(error.message);
      else await showToast({ style: Toast.Style.Failure, title: "Could not read the file" });
    }
  }

  return (
    <Form
      navigationTitle="Import Commands"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Commands" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        title="File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        error={fileError}
        onChange={() => setFileError(undefined)}
      />
    </Form>
  );
}
