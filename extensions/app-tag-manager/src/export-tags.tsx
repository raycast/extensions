import { Detail, ActionPanel, Action, Clipboard, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { loadTags } from "./services/tagStorage";
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

const AIPrompt = `Role:

Act as an expert application classifier, specializing in accurately tagging apps with functional and category labels based on their names.

Task:

Your task is to process a JSON object containing application information. You need to enrich the tags array for each application listed in the apps array.

Detailed Instructions:

Analyze each application's displayName to understand its core purpose.

Generate 2-4 relevant English tags that describe its function or category (e.g., "Browser", "Productivity", "Design", "Social", "Utility").

Append these new tags to the application's existing tags array.

Mandatory Rules:

Preserve Existing Data: You must not delete or alter any pre-existing tags in the tags array. This is an additive task only.

Avoid Duplicates: Do not add a tag if it already exists in the array.

Maintain Structure: Return the entire, updated JSON object, preserving its original structure.

Examples (Few-shot Learning):

For an app with displayName: "Visual Studio Code" and tags: [], your generated tags should result in tags: ["Development", "Code Editor", "Programming"].

For an app with displayName: "Slack" and tags: ["Work"], your additions should result in tags: ["Work", "Communication", "Messaging"].

Now, please process the following JSON data according to the rules and examples provided:`;

export default function ExportTagsCommand() {
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load current tag data
      const tagStorage = await loadTags();
      const appPaths = discoverApps();
      const appList = createInitialApps(appPaths, tagStorage);

      // Create export data with all apps (including those without tags)
      const data: ExportData = {
        exportTime: new Date().toISOString(),
        totalApps: appList.length,
        appsWithTags: appList.filter((app) => app.tags.length > 0).length,
        apps: appList.map((app) => ({
          name: app.name,
          displayName: app.displayName,
          path: app.path,
          tags: app.tags,
        })),
      };

      setExportData(data);
    } catch (error) {
      console.error("Failed to load data:", error);
      showToast(Toast.Style.Failure, "Failed to load tag data");
    } finally {
      setLoading(false);
    }
  };

  const copyPrompt = async () => {
    try {
      await Clipboard.copy(AIPrompt);
      showToast(Toast.Style.Success, "AI Prompt copied to clipboard");
    } catch (error) {
      console.error("Failed to copy prompt:", error);
      showToast(Toast.Style.Failure, "Failed to copy prompt");
    }
  };

  const performExport = async () => {
    if (!exportData) {
      showToast(Toast.Style.Failure, "No data to export");
      return;
    }

    try {
      // Copy to clipboard as formatted JSON
      const jsonString = JSON.stringify(exportData, null, 2);
      await Clipboard.copy(jsonString);

      // Show success message
      const { totalApps, appsWithTags } = exportData;
      showToast(
        Toast.Style.Success,
        "Export completed",
        `Exported ${totalApps} apps (${appsWithTags} with tags) to clipboard`,
      );
    } catch (error) {
      console.error("Export failed:", error);
      showToast(Toast.Style.Failure, "Failed to export tags");
    }
  };

  const getMarkdownContent = () => {
    if (loading) {
      return "# Loading...\n\nPreparing tag data for export...";
    }

    if (!exportData) {
      return "# Export Tags\n\n## Error\n\nFailed to load tag data. Please try again.";
    }

    const appsWithTags = exportData.apps.filter((app) => app.tags.length > 0);
    const totalTags = appsWithTags.reduce((sum, app) => sum + app.tags.length, 0);

    return `# Export Tags

## Overview

Export all your app tags to easily transfer them to another device or back them up.

**Statistics:** ${exportData.totalApps} apps • ${exportData.appsWithTags} tagged • ${totalTags} total tags

## How to Use

### Export Tags
1. Click **Export to Clipboard** to copy tag data as JSON
2. On another device, use the **Import Tags** command
3. The import will read the data from clipboard

### AI Auto-Tagging
1. Click **Copy AI Prompt** to copy the prompt
2. Paste it along with your exported JSON to an AI assistant
3. Import the AI-enhanced JSON back

---

## AI Auto-Tagging Prompt

Use this prompt with AI to automatically generate tags for your applications:

\`\`\`
${AIPrompt}
\`\`\`

*Export date: ${new Date(exportData.exportTime).toLocaleString()}*`;
  };

  return (
    <Detail
      markdown={getMarkdownContent()}
      actions={
        <ActionPanel>
          {exportData && (
            <>
              <Action title="Export to Clipboard" onAction={performExport} icon="doc.on.clipboard" />
              <Action title="Copy AI Prompt" onAction={copyPrompt} icon="text.quote" />
            </>
          )}
          <Action title="Refresh Data" onAction={loadData} icon="arrow.clockwise" />
        </ActionPanel>
      }
    />
  );
}
