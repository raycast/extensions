import {
  Action,
  ActionPanel,
  Form,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { importConfigFromJson } from "./storage";
import { readFileSync } from "fs";

export default function ImportConfig() {
  const [filePath, setFilePath] = useState<string[]>([]);
  const [jsonText, setJsonText] = useState("");

  async function handleImportFromFile() {
    if (filePath.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No file selected",
      });
      return;
    }

    try {
      const content = readFileSync(filePath[0], "utf-8");
      const result = await importConfigFromJson(content);

      if (result.success) {
        await showToast({
          style: Toast.Style.Success,
          title: "Config imported successfully",
        });
        await popToRoot();
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Import failed",
          message: result.error,
        });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to read file",
        message,
      });
    }
  }

  async function handleImportFromText() {
    if (!jsonText.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No JSON provided",
      });
      return;
    }

    const result = await importConfigFromJson(jsonText);

    if (result.success) {
      await showToast({
        style: Toast.Style.Success,
        title: "Config imported successfully",
      });
      await popToRoot();
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Import failed",
        message: result.error,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Import from File" onAction={handleImportFromFile} />
          <Action
            title="Import from JSON Text"
            onAction={handleImportFromText}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Import a Leader Key config.json file or paste JSON directly." />
      <Form.FilePicker
        id="configFile"
        title="Config File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        value={filePath}
        onChange={setFilePath}
      />
      <Form.Separator />
      <Form.TextArea
        id="jsonText"
        title="Or Paste JSON"
        placeholder='{"type": "group", "actions": [...]}'
        value={jsonText}
        onChange={setJsonText}
      />
    </Form>
  );
}
