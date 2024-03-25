import { Form, ActionPanel, Action, showToast, ToastStyle, Clipboard } from "@raycast/api";
import React, { useState, useEffect } from "react";

export default function ExtractJsonFieldValues() {
  const [json, setJson] = useState<any[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [selectedField, setSelectedField] = useState<string>("");

  useEffect(() => {
    // Tente de lire le contenu JSON du presse-papiers au chargement
    Clipboard.readText().then((text) => {
      if (text) {
        try {
          const parsedJson = JSON.parse(text);
          if (Array.isArray(parsedJson) && parsedJson.length > 0) {
            setJson(parsedJson);
            // Extraire les clés du premier objet JSON pour simplifier
            const initialFields = Object.keys(parsedJson[0]);
            setFields(initialFields);
          } else {
            showToast(ToastStyle.Failure, "Error", "Clipboard content is not valid JSON.");
          }
        } catch (error) {
          showToast(ToastStyle.Failure, "Error", "Clipboard content is not valid JSON.");
        }
      } else {
        showToast(ToastStyle.Failure, "Error", "Clipboard is empty or contains non-text content.");
      }
    });
  }, []);

  const handleExtractAndCopy = () => {
    if (!selectedField) {
      showToast(ToastStyle.Failure, "No field selected");
      return;
    }
    // Extraire les valeurs pour le champ sélectionné
    const fieldValues = json.map(item => item[selectedField]).filter(value => value !== undefined);
    // Copier les valeurs extraites dans le presse-papiers
    Clipboard.copy(fieldValues.join("\n")).then(() => 
      showToast(ToastStyle.Success, "Value extracted in your Clipboard")
    );
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Extract and copy" onAction={handleExtractAndCopy} />
        </ActionPanel>
      }>
      <Form.Dropdown
        id="field"
        title="Select a field"
        value={selectedField}
        onChange={setSelectedField}>
        {fields.map(field => (
          <Form.Dropdown.Item key={field} title={field} value={field} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
