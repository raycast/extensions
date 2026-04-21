import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { useTemplate } from "../hooks/useTemplate";
import fs from "fs";

const ExportTemplates = () => {
  const { templates } = useTemplate();
  const filteredTemplates = templates.filter((t) => t.id !== "none");

  const handleExportTemplates = async (values: { folders: string[]; filename: string }) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const cleanTemplates = filteredTemplates.map(({ id, ...rest }) => rest);

      if (cleanTemplates.length === 0) {
        showToast({ title: "No Templates to Export", style: Toast.Style.Failure });
        return;
      }

      const folder = values.folders[0];
      if (!fs.existsSync(folder) || !fs.lstatSync(folder).isDirectory()) {
        showToast({ title: "Invalid Folder", style: Toast.Style.Failure });
        return;
      }

      const templatesContent = JSON.stringify(cleanTemplates, null, 2);
      let filename = values.filename?.trim() || "prompt-templates.json";
      if (!filename.endsWith(".json")) filename = filename.concat(".json");

      const templatesPath = `${folder}/${filename}`;
      await fs.promises.writeFile(templatesPath, templatesContent);
      await showToast({ title: "Templates exported", style: Toast.Style.Success });
      popToRoot();
    } catch (error) {
      console.log(error);
      await showToast({ title: "Failed to export templates", style: Toast.Style.Failure });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Export Templates"
            icon={{ source: Icon.Download }}
            onSubmit={handleExportTemplates}
          />
        </ActionPanel>
      }
    >
      {filteredTemplates.length === 0 ? (
        <Form.Description text="No templates to export. Create a new template before exporting" />
      ) : (
        <>
          <Form.Description
            text={`${filteredTemplates.length} template${filteredTemplates.length === 1 ? "" : "s"} will be exported`}
          />
          <Form.FilePicker
            id="folders"
            title="Choose Export Folder"
            allowMultipleSelection={false}
            canChooseDirectories
            canChooseFiles={false}
            info="Choose a folder to export all your templates"
          />
          <Form.TextField id="filename" title="Filename" placeholder="prompt-templates.json" />
        </>
      )}
    </Form>
  );
};

export default ExportTemplates;
