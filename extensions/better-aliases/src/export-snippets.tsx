import {
  Action,
  ActionPanel,
  Detail,
  getPreferenceValues,
  popToRoot,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { writeFile } from "fs/promises";
import { join } from "path";
import { pickFolder } from "./lib/folderPicker";
import { getAllAliasesConfigAsync } from "./lib/getAllAliasesConfig";
import type { Preferences } from "./types";

interface RaycastSnippet {
  name: string;
  text: string;
  keyword?: string;
}

const FILENAME = "better-aliases-snippets.json";
const DEFAULT_SNIPPET_PREFIX = ",";

export default function Command() {
  const { snippetPrefix } = getPreferenceValues<Preferences>();
  const prefix = snippetPrefix || DEFAULT_SNIPPET_PREFIX;

  const markdown = `
# Export as Raycast Snippets

This command exports **all your aliases** as a Raycast Snippets JSON file.

## What gets exported?

All Better Aliases will be exported as snippets with keywords using your configured prefix.

**Current prefix:** \`${prefix}\`

For example, an alias \`gh\` will have keyword \`${prefix}gh\`

## How to use the exported file?

1. Press **Enter** or click "Choose Destination Folder" below
2. Select a folder where you want to save the file
3. The file \`${FILENAME}\` will be saved there
4. In Raycast, use **Import Snippets** command to import the file

## File format

The exported JSON follows Raycast's Snippets format:
\`\`\`json
[
  {
    "name": "Alias Label",
    "text": "Alias value (URL, text, etc.)",
    "keyword": "${prefix}alias"
  }
]
\`\`\`
`;

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

      const snippets: RaycastSnippet[] = entries.map(([alias, item]) => ({
        name: item.label || alias,
        text: item.value,
        keyword: `${prefix}${alias}`,
      }));

      const folder = await pickFolder();
      if (!folder) {
        return;
      }

      const filePath = join(folder, FILENAME);
      await writeFile(filePath, JSON.stringify(snippets, null, 2), "utf-8");

      await showToast({
        style: Toast.Style.Success,
        title: `Exported ${snippets.length} Snippet${snippets.length > 1 ? "s" : ""}`,
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
