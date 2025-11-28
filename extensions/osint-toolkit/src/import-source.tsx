/**
 * Import custom OSINT source
 *
 * Allows users to paste a JSON configuration for a custom source and store it locally
 */

import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { addCustomSource } from "./utils/osint-sources";
import { IOCType } from "./types";
import { OSINTSource } from "./types";

export default function ImportSourceCommand() {
  const [json, setJson] = useState<string>(`{
  "id": "my-source",
  "name": "My Source",
  "description": "Custom OSINT source",
  "url": "https://example.com/search?q=\${ioc}",
  "category": "Multi-Purpose",
  "supportedTypes": ["ip", "domain"],
  "requiresAuth": false,
  "isFree": true,
  "icon": "globe"
}`);

  const submit = async (values: { json: string }) => {
    try {
      const parsed = JSON.parse(values.json) as OSINTSource;

      // Basic validation
      if (!parsed.id || !parsed.name || !parsed.url || !parsed.supportedTypes) {
        showToast({
          style: Toast.Style.Failure,
          title: "Missing Fields",
          message: "id, name, url, and supportedTypes are required",
        });
        return;
      }

      // Normalize types to IOCType[]
      parsed.supportedTypes = (parsed.supportedTypes as string[]).map(
        (t) => t as IOCType,
      );

      await addCustomSource(parsed);
      showToast({
        style: Toast.Style.Success,
        title: "Source Imported",
        message: `${parsed.name} has been imported`,
      });
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to import",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Source" onSubmit={submit} />
          <Action.CopyToClipboard title="Copy Sample JSON" content={json} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Import Custom OSINT Source"
        text="Paste a JSON object that describes an OSINT source. Fields: id,name,description,url,category,supportedTypes,requiresAuth,isFree,icon"
      />
      <Form.TextArea
        id="json"
        title="Source JSON"
        placeholder="Paste JSON here"
        value={json}
        onChange={setJson}
      />
    </Form>
  );
}
