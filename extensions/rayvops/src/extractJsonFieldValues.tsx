import { Form, ActionPanel, Action, showToast, Toast, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";

type JsonItem = Record<string, unknown>;

export default function ExtractJsonFieldValues() {
  const [json, setJson] = useState<JsonItem[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [selectedField, setSelectedField] = useState<string>("");

  useEffect(() => {
    Clipboard.readText().then((text) => {
      if (text) {
        try {
          let parsedJson = JSON.parse(text);
          if (!Array.isArray(parsedJson)) {
            parsedJson = [parsedJson];
          }
          if (Array.isArray(parsedJson) && parsedJson.length > 0) {
            setJson(parsedJson);
            const initialFields = Object.keys(parsedJson[0]);
            setFields(initialFields);
          } else {
            showToast(Toast.Style.Failure, "Error", "Clipboard content is not valid JSON.");
          }
        } catch (error) {
          showToast(Toast.Style.Failure, "Error", "Clipboard content is not valid JSON.");
        }
      } else {
        showToast(Toast.Style.Failure, "Error", "Clipboard is empty or contains non-text content.");
      }
    });
  }, []);

  const handleExtractAndCopy = () => {
    if (!selectedField) {
      showToast(Toast.Style.Failure, "No field selected");
      return;
    }
    const fieldValues = json.map((item) => item[selectedField]).filter((value) => value !== undefined);
    // Copier les valeurs extraites dans le presse-papiers
    Clipboard.copy(fieldValues.join("\n")).then(() =>
      showToast(Toast.Style.Success, "Value extracted in your Clipboard"),
    );
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Extract and Copy" onAction={handleExtractAndCopy} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="field" title="Select a field" value={selectedField} onChange={setSelectedField}>
        {fields.map((field) => (
          <Form.Dropdown.Item key={field} title={field} value={field} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
