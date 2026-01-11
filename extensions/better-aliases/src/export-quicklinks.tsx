import { Action, ActionPanel, Detail, popToRoot, showInFinder, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { writeFile } from "fs/promises";
import { join } from "path";
import { pickFolder } from "./lib/folderPicker";
import { getAllAliasesConfigAsync } from "./lib/getAllAliasesConfig";

interface RaycastQuicklink {
  name: string;
  link: string;
}

const FILENAME = "better-aliases-quicklinks.json";

const markdown = `
# Export as Raycast Quicklinks

This command exports **all your aliases** as a Raycast Quicklinks JSON file.

## What gets exported?

All Better Aliases will be exported as quicklinks. The alias value (URL, file path, app, or text) will be used as the link.

## How to use the exported file?

1. Press **Enter** or click "Choose Destination Folder" below
2. Select a folder where you want to save the file
3. The file \`${FILENAME}\` will be saved there
4. In Raycast, use **Import Quicklinks** command to import the file

## File format

The exported JSON follows Raycast's Quicklinks format:
\`\`\`json
[
  {
    "name": "Alias Label",
    "link": "https://example.com or /path/to/app"
  }
]
\`\`\`

> **Note:** Non-URL values may not work as expected in Raycast Quicklinks. Consider using "Export as Raycast Snippets" for text-based aliases.
`;

export default function Command() {
  async function handleExport() {
    try {
      const aliases = await getAllAliasesConfigAsync();
      const entries = Object.entries(aliases);

      if (entries.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Aliases Found",
          message: "Create some aliases first",
        });
        return;
      }

      const quicklinks: RaycastQuicklink[] = entries.map(([alias, item]) => ({
        name: item.label || alias,
        link: item.value,
      }));

      const folder = await pickFolder();
      if (!folder) {
        return;
      }

      const filePath = join(folder, FILENAME);
      await writeFile(filePath, JSON.stringify(quicklinks, null, 2), "utf-8");

      await showToast({
        style: Toast.Style.Success,
        title: `Exported ${quicklinks.length} Quicklink${quicklinks.length > 1 ? "s" : ""}`,
        message: `Saved to ${FILENAME}`,
      });

      await showInFinder(filePath);
      await popToRoot();
    } catch (error) {
      await showFailureToast(error, { title: "Export Failed" });
    }
  }

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Choose Destination Folder" onAction={handleExport} />
        </ActionPanel>
      }
    />
  );
}
