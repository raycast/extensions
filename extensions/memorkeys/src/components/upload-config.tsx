import { ActionPanel, Form, Action, showToast, Toast, useNavigation } from "@raycast/api";
import fs from "fs";
import { promisify } from "util";
import { gunzip } from "zlib";
import path from "path";
import { formatShortcutData, FormattedShortcut } from "../util/configFormat";
import { exec } from "child_process";
import { environment } from "@raycast/api";

const gunzipAsync = promisify(gunzip);

// Raw shortcut data from Raycast config
interface RaycastShortcut {
  key: string; // Unique identifier for the shortcut
  hotkey: string; // Raw hotkey string (e.g., "Command-Shift-A")
  type?: string; // Optional type information
}

interface UploadConfigFormProps {
  onUploadComplete?: () => void;
}

// Structure of the Raycast config file
interface RaycastConfig {
  builtin_package_rootSearch?: {
    rootSearch: RaycastShortcut[];
  };
  shortcuts?: RaycastShortcut[];
  builtin_package_raycastPreferences?: {
    preferencesShortcuts: Record<string, RaycastShortcut>;
  };
}

// Process a Raycast config file and extract shortcuts
async function processRaycastConfig(filePath: string): Promise<FormattedShortcut[] | null> {
  try {
    // Read and decompress the binary config file
    const binaryContent = await fs.promises.readFile(filePath);
    const decompressedData = await gunzipAsync(binaryContent);
    console.log("Decompressed successfully");

    // Parse the JSON data
    const jsonData = JSON.parse(decompressedData.toString()) as RaycastConfig;
    console.log("=== JSON Data Structure ===");
    console.log("Available keys:", Object.keys(jsonData));

    let shortcuts: RaycastShortcut[] = [];

    // Try to find shortcuts in different possible locations
    if (jsonData.builtin_package_rootSearch?.rootSearch) {
      console.log("Found shortcuts in builtin_package_rootSearch.rootSearch");
      shortcuts = jsonData.builtin_package_rootSearch.rootSearch;
    } else if (jsonData.shortcuts) {
      console.log("Found shortcuts in shortcuts");
      shortcuts = jsonData.shortcuts;
    } else if (jsonData.builtin_package_raycastPreferences?.preferencesShortcuts) {
      console.log("Found shortcuts in preferencesShortcuts");
      shortcuts = Object.entries(jsonData.builtin_package_raycastPreferences.preferencesShortcuts).map(
        ([key, value]) => ({
          ...value,
          key,
          type: "preference",
        }),
      );
    }

    if (!shortcuts || !shortcuts.length) {
      console.error("No shortcuts found in config");
      console.log("Full config structure:", JSON.stringify(jsonData, null, 2));
      return null;
    }

    // Format the shortcuts into a consistent structure
    console.log(`Found ${shortcuts.length} shortcuts before formatting`);
    const formattedData = formatShortcutData(shortcuts);
    console.log("=== Formatting completed successfully ===");
    console.log(`Formatted ${formattedData.length} shortcuts`);
    return formattedData;
  } catch (error) {
    console.error("Error processing config:", error);
    return null;
  }
}

// Component that handles uploading and processing Raycast config files
export default function UploadConfigForm({ onUploadComplete }: UploadConfigFormProps) {
  const { pop } = useNavigation();
  const outputPath = path.join(environment.supportPath, "processed_configs");

  // Handle form submission with selected config file
  const handleSubmit = async (values: { files: string[] }) => {
    const file = values.files[0];

    // Validate file exists and is a .rayconfig file
    if (!file || !fs.existsSync(file)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid File",
        message: "Please select a file",
      });
      return;
    }

    if (path.extname(file) !== ".rayconfig") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid File Type",
        message: "Please select a .rayconfig file",
      });
      return;
    }

    try {
      // Process the config file
      const processedData = await processRaycastConfig(file);

      if (!processedData) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Processing Failed",
          message: "Failed to process the config file",
        });
        return;
      }

      // Create output directory if needed
      await fs.promises.mkdir(outputPath, { recursive: true });

      // Save processed shortcuts with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `shortcuts_${timestamp}.json`;
      const outputFile = path.join(outputPath, fileName);

      await fs.promises.writeFile(outputFile, JSON.stringify(processedData, null, 2));

      // Call the onUploadComplete callback if provided
      if (onUploadComplete) {
        await onUploadComplete();
      }

      // Show success toast with action to open folder
      await showToast({
        style: Toast.Style.Success,
        title: `Found ${processedData.length} shortcuts`,
        message: `Saved to ${fileName}`,
        primaryAction: {
          title: "Open Folder",
          onAction: () => {
            exec(`open "${outputPath}"`);
          },
        },
      });

      // Return to previous view
      pop();
    } catch (error) {
      console.error("Error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to process or save the config",
      });
    }
  };

  // Render the upload form
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Process Config" onSubmit={handleSubmit} />
          <Action.ShowInFinder
            title="Open Output Folder"
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            path={outputPath}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Select a Raycast config file (.rayconfig) to extract and store shortcut information." />
      <Form.FilePicker id="files" allowMultipleSelection={false} title="Config File" />
    </Form>
  );
}
