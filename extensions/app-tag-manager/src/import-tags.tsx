import { ActionPanel, Action, Detail, Clipboard, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { useState, useEffect } from "react";
import { saveTags, loadTags } from "./services/tagStorage";
import { discoverApps, createInitialApps } from "./services/appDiscovery";

interface ExportData {
  exportTime: string;
  totalApps: number;
  appsWithTags: number;
  apps: Array<{
    name: string;
    displayName: string;
    path: string;
    tags: string[];
  }>;
}

export default function ImportTagsCommand() {
  const [importData, setImportData] = useState<ExportData | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClipboardContent();
  }, []);

  const loadClipboardContent = async () => {
    try {
      const content = await Clipboard.readText();

      if (content) {
        try {
          const parsed = JSON.parse(content) as ExportData;

          // Validate the structure
          if (parsed.apps && Array.isArray(parsed.apps) && parsed.exportTime) {
            setImportData(parsed);
          } else {
            setError("Clipboard does not contain valid tag export data");
          }
        } catch {
          setError("Clipboard content is not valid JSON");
        }
      } else {
        setError("Clipboard is empty");
      }
    } catch {
      setError("Failed to read clipboard");
    } finally {
      setLoading(false);
    }
  };

  const performImport = async () => {
    if (!importData) {
      showToast(Toast.Style.Failure, "No valid import data");
      return;
    }

    const confirmed = await confirmAlert({
      title: "Import Tags",
      message: `This will import ${importData.appsWithTags} apps with tags from ${new Date(
        importData.exportTime,
      ).toLocaleString()}. Existing tags will be overwritten.`,
      primaryAction: {
        title: "Import",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
      },
    });

    if (!confirmed) {
      return;
    }

    try {
      // Get current app list to verify apps exist
      const currentTagStorage = await loadTags();
      const currentAppPaths = discoverApps();
      const currentAppList = createInitialApps(currentAppPaths, currentTagStorage);
      const currentAppNames = new Set(currentAppList.map((app) => app.name));

      let importedCount = 0;
      let skippedCount = 0;

      // Import tags for each app
      for (const importApp of importData.apps) {
        if (currentAppNames.has(importApp.name)) {
          await saveTags(importApp.name, importApp.tags);
          if (importApp.tags.length > 0) {
            importedCount++;
          }
        } else {
          skippedCount++;
        }
      }

      showToast(
        Toast.Style.Success,
        "Import completed",
        `Imported tags for ${importedCount} apps${skippedCount > 0 ? `, skipped ${skippedCount} missing apps` : ""}`,
      );
    } catch (error) {
      console.error("Import failed:", error);
      showToast(Toast.Style.Failure, "Import failed");
    }
  };

  const getMarkdownContent = () => {
    if (loading) {
      return "# Loading clipboard content...";
    }

    if (error) {
      return `# Import Tags

## Error
❌ ${error}

## Instructions
1. Export tags from another device using the "Export Tags" command
2. Copy the exported JSON data to your clipboard
3. Run this command again to import the tags`;
    }

    if (!importData) {
      return `# Import Tags

## No Valid Data
Clipboard does not contain valid tag export data.

## Instructions
1. Export tags from another device using the "Export Tags" command
2. Copy the exported JSON data to your clipboard
3. Run this command again to import the tags`;
    }

    const exportDate = new Date(importData.exportTime).toLocaleString();
    const appsWithTags = importData.apps.filter((app) => app.tags.length > 0);

    return `# Import Tags

## Export Information
- **Export Date:** ${exportDate}
- **Total Apps:** ${importData.totalApps}
- **Apps with Tags:** ${importData.appsWithTags}

## Preview (Apps with Tags)
${appsWithTags
  .slice(0, 10)
  .map((app) => `- **${app.displayName}**: ${app.tags.join(", ")}`)
  .join("\n")}${appsWithTags.length > 10 ? `\n\n*...and ${appsWithTags.length - 10} more apps*` : ""}

## Actions
Use the "Import Tags" action to proceed with the import.`;
  };

  return (
    <Detail
      markdown={getMarkdownContent()}
      actions={
        <ActionPanel>
          {importData && (
            <Action
              title="Import Tags"
              onAction={performImport}
              icon="square.and.arrow.down"
              style={Action.Style.Destructive}
            />
          )}
          <Action title="Reload Clipboard" onAction={loadClipboardContent} icon="arrow.clockwise" />
        </ActionPanel>
      }
    />
  );
}
