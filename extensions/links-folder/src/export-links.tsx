import { useState, useEffect } from "react";
import {
  ActionPanel,
  Action,
  Form,
  Icon,
  showToast,
  Toast,
  environment,
  getPreferenceValues,
  showInFinder,
  LocalStorage,
  popToRoot,
} from "@raycast/api";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

function getPreferencePath(): string | undefined {
  try {
    const prefs = getPreferenceValues<{ linksPath?: string }>();
    return prefs.linksPath?.trim() || undefined;
  } catch {
    return undefined;
  }
}

// Helper to format date as YYYY-MM-DDTHH.MM.SS
function getFormattedDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}.${minutes}.${seconds}`;
}

export default function ExportCommand() {
  const [lastFolder, setLastFolder] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load the last used folder from LocalStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await LocalStorage.getItem<string>("lastExportFolder");
        if (stored && fs.existsSync(stored)) {
          setLastFolder([stored]);
        } else {
          // Fallback to Downloads if no preference is saved or if the saved folder was deleted
          setLastFolder([path.join(os.homedir(), "Downloads")]);
        }
      } catch {
        // Variable "error" removed to fix no-unused-vars rule
        setLastFolder([path.join(os.homedir(), "Downloads")]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function handleSubmit(values: { destination: string[] }) {
    const destFolder = values.destination[0];

    if (!destFolder) {
      await showToast({ style: Toast.Style.Failure, title: "Please select a folder" });
      return;
    }

    const prefPath = getPreferencePath();
    const sourcePath = prefPath || path.join(environment.supportPath, "links.json");

    if (!fs.existsSync(sourcePath)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No links found",
        message: "You haven't saved any links yet.",
      });
      return;
    }

    try {
      const fileName = `LinksFolder_JsonFile_${getFormattedDateString()}.json`;
      const exportPath = path.join(destFolder, fileName);

      // Copy the JSON to the chosen directory
      fs.copyFileSync(sourcePath, exportPath);

      // Save this folder choice for the next time
      await LocalStorage.setItem("lastExportFolder", destFolder);

      await showToast({
        style: Toast.Style.Success,
        title: "Exported Successfully",
        message: `Saved as ${fileName}`,
        primaryAction: {
          title: "Show in Finder",
          onAction: () => showInFinder(exportPath),
        },
      });

      popToRoot();
    } catch (error) {
      console.error("Export failed:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Export Failed",
        message: String(error),
      });
    }
  }

  if (isLoading) {
    return <Form isLoading={true} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Export Links" icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Choose a destination to export your links.json file. Raycast will remember this location for your next export." />

      <Form.FilePicker
        id="destination"
        title="Save Location"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        value={lastFolder}
        onChange={setLastFolder}
      />
    </Form>
  );
}
