import { Form, ActionPanel, Action, showToast, LocalStorage, Icon, useNavigation, Clipboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";

type ShardInfo = {
  id: string;
  tableName: string;
  schemeName: string;
  schemeSize: number;
  tableSize: number;
  shardFactor: string;
};

// Import config file format
type ImportConfig = {
  version?: string;
  exportDate?: string;
  configs: ShardInfo[];
};

interface ImportFormProps {
  onImportSuccess?: (importedCount: number) => void;
}

export default function ImportForm({ onImportSuccess }: ImportFormProps) {
  const [configData, setConfigData] = useState("");
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  // Validate and parse JSON data
  function validateAndParseConfig(jsonString: string): ImportConfig | null {
    try {
      const parsed = JSON.parse(jsonString);

      // Support two formats:
      // 1. Direct array format (old format)
      // 2. Object format with version information (new format)
      let configs: ShardInfo[];

      if (Array.isArray(parsed)) {
        // Old format: directly the config array
        configs = parsed;
      } else if (parsed.configs && Array.isArray(parsed.configs)) {
        // New format: contains version information object
        configs = parsed.configs;
      } else {
        throw new Error("Unsupported config format");
      }

      // Validate config data structure and convert type
      const validatedConfigs: ShardInfo[] = [];

      for (const config of configs) {
        if (!config.tableName || !config.schemeName) {
          throw new Error("Config data format error: missing required fields tableName or schemeName");
        }

        // Process number fields, support string and number types
        let schemeSize: number;
        let tableSize: number;

        if (typeof config.schemeSize === "string") {
          schemeSize = parseInt(config.schemeSize, 10);
        } else if (typeof config.schemeSize === "number") {
          schemeSize = config.schemeSize;
        } else {
          throw new Error("Config data format error: schemeSize must be a number or number string");
        }

        if (typeof config.tableSize === "string") {
          tableSize = parseInt(config.tableSize, 10);
        } else if (typeof config.tableSize === "number") {
          tableSize = config.tableSize;
        } else {
          throw new Error("Config data format error: tableSize must be a number or number string");
        }

        // Validate number validity
        if (isNaN(schemeSize) || isNaN(tableSize) || schemeSize <= 0 || tableSize <= 0) {
          throw new Error("Config data format error: DB count and table count must be valid numbers greater than 0");
        }

        // Construct correct config object
        const validatedConfig: ShardInfo = {
          id: config.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
          tableName: config.tableName,
          schemeName: config.schemeName,
          schemeSize: schemeSize,
          tableSize: tableSize,
          shardFactor: config.shardFactor || "",
        };

        validatedConfigs.push(validatedConfig);
      }

      return { configs: validatedConfigs };
    } catch (error) {
      console.error("Failed to parse config:", error);
      return null;
    }
  }

  // Process import
  async function handleImport(values: { configData: string; importMode: string }) {
    if (!values.configData.trim()) {
      showFailureToast({
        title: "Import failed",
        message: "Please input config data",
      });
      return;
    }

    setIsLoading(true);

    try {
      const importConfig = validateAndParseConfig(values.configData);

      if (!importConfig) {
        showFailureToast({
          title: "Import failed",
          message: "Config data format error, please check JSON format",
        });
        return;
      }

      // Read existing data
      const existingData = await LocalStorage.getItem<string>("shardInfoList");
      let currentConfigs: ShardInfo[] = [];

      if (existingData) {
        try {
          currentConfigs = JSON.parse(existingData);
        } catch (error) {
          console.error("Failed to parse existing data:", error);
          showFailureToast({
            title: "Import failed",
            message: `Failed to parse existing data`,
          });
          currentConfigs = [];
        }
      }

      let finalConfigs: ShardInfo[];

      if (values.importMode === "replace") {
        // Replace mode: directly use imported config
        finalConfigs = importConfig.configs;
      } else {
        // Merge mode: merge configs, avoid duplicates
        const existingIds = new Set(currentConfigs.map((c) => c.id));
        const newConfigs = importConfig.configs.map((config) => {
          // If ID exists, generate new ID
          if (existingIds.has(config.id)) {
            return {
              ...config,
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            };
          }
          return config;
        });

        finalConfigs = [...currentConfigs, ...newConfigs];
      }

      // Save to LocalStorage
      await LocalStorage.setItem("shardInfoList", JSON.stringify(finalConfigs));

      showToast({
        title: "Import success",
        message: `Imported ${importConfig.configs.length} configs`,
      });

      // First call success callback, let list page update data
      if (onImportSuccess) {
        onImportSuccess(importConfig.configs.length);
      }

      pop();
    } catch (error) {
      console.error("Import failed:", error);
      showFailureToast({
        title: "Import failed",
        message: "Failed to save config data",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Read data from clipboard
  async function loadFromClipboard() {
    try {
      const clipboardText = await Clipboard.readText();

      if (clipboardText) {
        setConfigData(clipboardText);
        showToast({
          title: "Read clipboard",
          message: "Config data has been loaded from clipboard",
        });
      } else {
        showFailureToast({
          title: "Clipboard is empty",
          message: "No text data available in clipboard",
        });
      }
    } catch (error) {
      console.error("Failed to read clipboard:", error);
      showFailureToast({
        title: "Read failed",
        message: "Failed to read clipboard content",
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Config" icon={Icon.Upload} onSubmit={handleImport} />
          <Action
            title="Read from Clipboard"
            icon={Icon.Clipboard}
            onAction={loadFromClipboard}
            shortcut={{ modifiers: ["cmd"], key: "v" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="configData"
        title="Config Data"
        placeholder="Please paste JSON formatted config data..."
        value={configData}
        onChange={setConfigData}
        info="Support JSON data generated from export function or direct config array format"
      />

      <Form.Separator />

      <Form.Dropdown
        id="importMode"
        title="Import Mode"
        value={importMode}
        onChange={(value) => setImportMode(value as "merge" | "replace")}
        info="Select how to handle imported config data"
      >
        <Form.Dropdown.Item value="merge" title="Merge Config" icon={Icon.Plus} />
        <Form.Dropdown.Item value="replace" title="Replace Config" icon={Icon.RotateClockwise} />
      </Form.Dropdown>

      <Form.Description
        title="Description"
        text="• Merge mode: add imported configs to existing configs&#10;• Replace mode: replace all existing configs with imported configs&#10;• Can use ⌘V shortcut to read data from clipboard"
      />
    </Form>
  );
}
