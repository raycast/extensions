import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  popToRoot,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { writeFile } from "fs/promises";
import { join } from "path";
import { getAllAliasesConfigAsync } from "./lib/getAllAliasesConfig";
import type { Preferences } from "./schemas";

interface RaycastSnippet {
  name: string;
  text: string;
  keyword?: string;
}

interface ExportFormValues {
  destinationFolder: string[];
}

const FILENAME = "better-aliases-snippets.json";
const DEFAULT_SNIPPET_PREFIX = ",";

export default function Command() {
  const { snippetPrefix } = getPreferenceValues<Preferences>();
  const prefix = snippetPrefix || DEFAULT_SNIPPET_PREFIX;

  const { handleSubmit, itemProps } = useForm<ExportFormValues>({
    onSubmit: async (values) => {
      try {
        const folder = values.destinationFolder[0];
        if (!folder) {
          await showToast({
            style: Toast.Style.Failure,
            title: "No Folder Selected",
            message: "Please select a destination folder",
          });
          return;
        }

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
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Export Snippets" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Export as Raycast Snippets"
        text={`This command exports all your aliases as a Raycast Snippets JSON file. All Better Aliases will be exported as snippets with keywords using your configured prefix (current: ${prefix}).`}
      />
      <Form.FilePicker
        title="Destination Folder"
        canChooseDirectories
        canChooseFiles={false}
        {...itemProps.destinationFolder}
      />
    </Form>
  );
}
