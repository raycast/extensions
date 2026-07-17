import { Action, ActionPanel, Form, popToRoot, showInFinder, showToast, Toast } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { writeFile } from "fs/promises";
import { join } from "path";
import { getAllAliasesConfigAsync } from "./lib/getAllAliasesConfig";

interface RaycastQuicklink {
  name: string;
  link: string;
}

interface ExportFormValues {
  destinationFolder: string[];
}

const FILENAME = "better-aliases-quicklinks.json";

export default function Command() {
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

        const quicklinks: RaycastQuicklink[] = entries.map(([alias, item]) => ({
          name: item.label || alias,
          link: item.value,
        }));

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
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Export Quicklinks" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Export as Raycast Quicklinks"
        text="This command exports all your aliases as a Raycast Quicklinks JSON file. The alias value (URL, file path, app, or text) will be used as the link."
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
