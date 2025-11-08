import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { PresetConfig } from "../../core/types";
import { StorageManager } from "../../core/storage";
import { PresetManager } from "../../core/presets";
import { validatePresetConfig } from "../utils/validation";

interface PresetImportProps {
  onImport?: () => void;
}

interface ImportFormValues {
  jsonInput: string;
  handleConflicts: "overwrite" | "rename";
}

export function PresetImport({ onImport }: PresetImportProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [parsedPreset, setParsedPreset] = useState<PresetConfig | null>(null);
  const [conflictDetected, setConflictDetected] = useState(false);
  const [existingPreset, setExistingPreset] = useState<PresetConfig | null>(null);
  const { pop } = useNavigation();

  const validateAndParseJSON = async (jsonInput: string) => {
    try {
      const parsed = JSON.parse(jsonInput) as Partial<PresetConfig>;

      const validationResult = validatePresetConfig(parsed);
      if (!validationResult.isValid) {
        throw new Error(validationResult.error);
      }

      const allPresets = await PresetManager.getAllPresets();
      const existing = allPresets.find((p) => p.id === parsed.id || p.name === parsed.name);

      if (existing) {
        setConflictDetected(true);
        setExistingPreset(existing);
      } else {
        setConflictDetected(false);
        setExistingPreset(null);
      }

      const presetConfig: PresetConfig = {
        id: parsed.id || "",
        name: parsed.name!,
        description: parsed.description || "",
        systemPrompt: parsed.systemPrompt!,
        tags: parsed.tags || [],
        isBuiltIn: false,
        examples: parsed.examples || [],
        createdAt: parsed.createdAt,
        updatedAt: parsed.updatedAt,
      };

      setParsedPreset(presetConfig);
      return presetConfig;
    } catch (error) {
      throw new Error(`Invalid JSON: ${error}`);
    }
  };

  const handleImport = async (values: ImportFormValues) => {
    const inputToUse = jsonInput || values.jsonInput;

    if (!inputToUse.trim()) {
      showToast(Toast.Style.Failure, "Please paste JSON content");
      return;
    }

    setIsLoading(true);

    try {
      const parsed = JSON.parse(inputToUse);

      if (parsed.presets && Array.isArray(parsed.presets)) {
        const options = {
          overwrite: values.handleConflicts === "overwrite",
          merge: true,
        };

        const results = await StorageManager.importAllCustomPresets(inputToUse, options);

        if (results.errors.length > 0) {
          showToast(
            Toast.Style.Failure,
            `Import completed with errors: ${results.imported} imported, ${results.skipped} failed`,
          );
        } else {
          showToast(Toast.Style.Success, `Successfully imported ${results.imported} presets`);
        }
      } else {
        await validateAndParseJSON(inputToUse);

        if (!parsedPreset) {
          throw new Error("Failed to parse preset");
        }

        const options = {
          overwrite: values.handleConflicts === "overwrite",
        };

        const importedPreset = await StorageManager.importCustomPreset(inputToUse, options);
        showToast(Toast.Style.Success, `Preset "${importedPreset.name}" imported successfully`);
      }

      onImport?.();
      pop();
    } catch (error) {
      showToast(Toast.Style.Failure, `Import failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJSONInputChange = async (newJsonInput: string) => {
    setJsonInput(newJsonInput);

    if (newJsonInput.trim()) {
      try {
        await validateAndParseJSON(newJsonInput);
      } catch {
        setParsedPreset(null);
        setConflictDetected(false);
        setExistingPreset(null);
      }
    } else {
      setParsedPreset(null);
      setConflictDetected(false);
      setExistingPreset(null);
    }
  };

  const loadSamplePreset = () => {
    const samplePreset: PresetConfig = {
      id: "",
      name: "Sample Custom Preset",
      description: "A sample preset to get you started",
      systemPrompt:
        "You are a helpful assistant. Respond to the user's request with {{style}} style.\n\nUser request: {{input}}",
      tags: ["sample", "template"],
      isBuiltIn: false,
      examples: [
        {
          input: "Explain quantum computing",
          expectedOutput: "A clear explanation of quantum computing concepts",
          description: "Example of how the preset handles technical topics",
        },
      ],
    };

    const sampleJson = JSON.stringify(samplePreset, null, 2);
    handleJSONInputChange(sampleJson);
    showToast(Toast.Style.Success, "Sample preset loaded - modify as needed");
  };

  const loadFromClipboard = async () => {
    try {
      const { Clipboard } = await import("@raycast/api");
      const clipboardText = await Clipboard.readText();

      if (!clipboardText) {
        showToast(Toast.Style.Failure, "Clipboard is empty");
        return "";
      }

      // Try to validate the clipboard content
      try {
        await validateAndParseJSON(clipboardText);
        showToast(Toast.Style.Success, "Valid preset JSON found in clipboard");
      } catch (error) {
        showToast(Toast.Style.Failure, `Clipboard contains invalid JSON: ${error}`);
        return "";
      }

      return clipboardText;
    } catch (error) {
      showToast(Toast.Style.Failure, `Failed to read clipboard: ${error}`);
      return "";
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Preset" onSubmit={handleImport} />
          <Action
            title="Load from Clipboard"
            shortcut={{ modifiers: ["cmd"], key: "v" }}
            onAction={async () => {
              const clipboardText = await loadFromClipboard();
              if (clipboardText) {
                await handleJSONInputChange(clipboardText);
              }
            }}
          />
          <Action
            title="Load Sample Preset"
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={() => loadSamplePreset()}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="jsonInput"
        title="JSON Content"
        placeholder="Paste preset JSON here (single preset or multiple presets export)..."
        info="Paste the JSON content of the preset(s) you want to import. Supports both single preset and bulk export formats."
        value={jsonInput}
        onChange={handleJSONInputChange}
      />

      {parsedPreset && (
        <>
          <Form.Separator />
          <Form.Description
            title="Preview"
            text={`Name: ${parsedPreset.name}\nDescription: ${parsedPreset.description || "No description"}\nTags: ${parsedPreset.tags.join(", ") || "None"}`}
          />
        </>
      )}

      {conflictDetected && existingPreset && (
        <>
          <Form.Separator />
          <Form.Description
            title="⚠️ Conflict Detected"
            text={`A preset with ${existingPreset.id === parsedPreset?.id ? "the same ID" : "the same name"} already exists: "${existingPreset.name}"`}
          />
          <Form.Dropdown id="handleConflicts" title="Handle Conflicts" defaultValue="rename">
            <Form.Dropdown.Item value="rename" title="Create with new ID" />
            <Form.Dropdown.Item value="overwrite" title="Overwrite existing preset" />
          </Form.Dropdown>
        </>
      )}

      {!conflictDetected && (
        <Form.Dropdown id="handleConflicts" title="Import Mode" defaultValue="rename">
          <Form.Dropdown.Item value="rename" title="Create as new preset" />
        </Form.Dropdown>
      )}
    </Form>
  );
}
