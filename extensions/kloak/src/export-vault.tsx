import React, { useState } from "react";
import { Form, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { requestDaemon } from "./kloak-ipc.js";

export default function ExportVaultCommand() {
  const [format, setFormat] = useState<string>("kloak-json");
  const [password, setPassword] = useState<string>("");
  const [exportedData, setExportedData] = useState<string>("");

  async function handleExport() {
    try {
      const res = await requestDaemon("vault.export", {
        options: {
          format,
          password: password || undefined
        }
      });
      setExportedData(res.data);
      showToast({
        style: Toast.Style.Success,
        title: `Export ready (${res.filename})`,
        message: res.warning || "Ready to copy or save"
      });
    } catch (err: any) {
      showToast({ style: Toast.Style.Failure, title: "Export failed", message: err.message });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Export" icon={Icon.Upload} onSubmit={handleExport} />
          {exportedData && (
            <Action.CopyToClipboard title="Copy Export Data" content={exportedData} />
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown id="format" title="Export Format" value={format} onChange={setFormat}>
        <Form.Dropdown.Item value="kloak-encrypted" title="Kloak Encrypted Backup (.kloak)" />
        <Form.Dropdown.Item value="bitwarden-json" title="Bitwarden JSON (Open Standard)" />
        <Form.Dropdown.Item value="kloak-json" title="Kloak Standard JSON" />
        <Form.Dropdown.Item value="kloak-csv" title="Plaintext CSV" />
      </Form.Dropdown>

      {format === "kloak-encrypted" && (
        <Form.PasswordField
          id="password"
          title="Backup Encryption Password"
          value={password}
          onChange={setPassword}
        />
      )}

      {exportedData && (
        <Form.TextArea id="output" title="Export Data" value={exportedData} onChange={() => {}} />
      )}
    </Form>
  );
}
