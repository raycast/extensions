import React, { useState } from "react";
import { Form, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { requestDaemon } from "./kloak-ipc.js";

export default function ImportVaultCommand() {
  const [format, setFormat] = useState<string>("auto");
  const [content, setContent] = useState<string>("");

  async function handleImport() {
    if (!content.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Please paste export data" });
      return;
    }

    try {
      const res = await requestDaemon("vault.import", {
        content,
        format
      });
      showToast({
        style: Toast.Style.Success,
        title: `Imported ${res.imported} items!`,
        message: res.warnings?.length ? `${res.warnings.length} warnings reported` : undefined
      });
    } catch (err: any) {
      showToast({ style: Toast.Style.Failure, title: "Import failed", message: err.message });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Import" icon={Icon.Download} onSubmit={handleImport} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="format" title="Format" value={format} onChange={setFormat}>
        <Form.Dropdown.Item value="auto" title="Auto-Detect (Recommended)" />
        <Form.Dropdown.Item value="bitwarden-json" title="Bitwarden (JSON)" />
        <Form.Dropdown.Item value="bitwarden-csv" title="Bitwarden (CSV)" />
        <Form.Dropdown.Item value="1password-1pux" title="1Password (.1pux)" />
        <Form.Dropdown.Item value="1password-1pif" title="1Password (.1pif)" />
        <Form.Dropdown.Item value="apple-csv" title="Apple Passwords (CSV)" />
        <Form.Dropdown.Item value="chrome-csv" title="Chrome / Brave / Edge (CSV)" />
        <Form.Dropdown.Item value="lastpass-csv" title="LastPass (CSV)" />
        <Form.Dropdown.Item value="keepass-xml" title="KeePass (XML)" />
        <Form.Dropdown.Item value="proton-csv" title="Proton Pass (CSV)" />
        <Form.Dropdown.Item value="dashlane-csv" title="Dashlane (CSV)" />
      </Form.Dropdown>

      <Form.TextArea
        id="content"
        title="File Content"
        placeholder="Paste CSV, JSON, or 1PIF content here..."
        value={content}
        onChange={setContent}
      />
    </Form>
  );
}
