import { Action, ActionPanel, Form, showToast, Toast, environment } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import fs from "fs/promises";
import path from "node:path";
import { useMcp } from "../../hooks/useMcp";

interface Props {
  configPath: string;
  onSave: () => void;
}

export function ConfigForm({ configPath, onSave }: Props) {
  const [configContent, setConfigContent] = useState("");
  const { loadConfig: reloadMcpConfig } = useMcp();

  const loadConfig = useCallback(async () => {
    try {
      const content = await fs.readFile(configPath, "utf-8");
      setConfigContent(content);
    } catch (error) {
      console.error("Error reading config:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error reading config",
        message: String(error),
      });
    }
  }, [configPath]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = useCallback(
    async (values: { config: string }) => {
      try {
        await fs.writeFile(configPath, values.config);
        await showToast({
          style: Toast.Style.Success,
          title: "Config saved",
        });
        onSave();
      } catch (error) {
        console.error("Error saving config:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error saving config",
          message: String(error),
        });
      }
    },
    [configPath, onSave, reloadMcpConfig]
  );

  return (
    <Form
      navigationTitle="Edit Config"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Config" onSubmit={handleSave} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="config" title="Config" value={configContent} onChange={setConfigContent} />
    </Form>
  );
}
