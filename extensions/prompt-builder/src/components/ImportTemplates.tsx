import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import fs from "fs";
import { FormValues, Template } from "../types";
import { useTemplate } from "../hooks/useTemplate";
import { validateTemplate } from "../utils/validation";

const ImportTemplates = () => {
  const { templates, addTemplates } = useTemplate();

  const dedupeTitle = (title: string, existing: string[]) => {
    const existingLower = existing.map((t) => t.toLowerCase());
    if (!existingLower.includes(title.toLowerCase())) return title;
    let counter = 1;
    let newTitle = `${title} (${counter})`;
    while (existingLower.includes(newTitle.toLowerCase())) {
      counter++;
      newTitle = `${title} (${counter})`;
    }
    return newTitle;
  };

  const handleImportTemplates = async (values: { file: string[] }) => {
    try {
      const filePath = values.file[0];

      if (!filePath || !fs.existsSync(filePath)) {
        showToast({ title: "Invalid file", style: Toast.Style.Failure });
        return;
      }
      const content = await fs.promises.readFile(filePath, "utf8");

      // Check JSON syntax
      let imported: unknown;
      try {
        imported = JSON.parse(content);
      } catch {
        showToast({ title: "Invalid JSON format", style: Toast.Style.Failure });
        return;
      }

      if (!Array.isArray(imported)) {
        showToast({ title: "Invalid JSON structure", style: Toast.Style.Failure });
        return;
      }

      if (imported.length === 0) {
        showToast({ title: "No Templates Found in File", style: Toast.Style.Failure });
        return;
      }

      const existingTitles = templates.map((t) => t.title);
      const batch: { title: string; values: FormValues }[] = [];

      for (const entry of imported) {
        if (validateTemplate(entry)) {
          const { title, ...rest } = entry as Omit<Template, "id">;
          const uniqueTitle = dedupeTitle(title, existingTitles);
          existingTitles.push(uniqueTitle);
          batch.push({ title: uniqueTitle, values: rest });
        } else {
          console.log("Skipped imported Template: \n", entry);
        }
      }

      if (batch.length === 0) {
        showToast({ title: "No Valid Templates Found", style: Toast.Style.Failure });
        return;
      }

      await addTemplates(batch);

      if (batch.length === imported.length) {
        showToast({ title: "All Templates Successfully Imported", style: Toast.Style.Success });
      } else {
        showToast({
          title: `Successfully Imported ${batch.length}/${imported.length} Templates`,
          style: Toast.Style.Success,
        });
      }
      popToRoot();
    } catch (error) {
      showToast({ title: "Unexpected error", style: Toast.Style.Failure });
      console.log(error);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Templates" icon={{ source: Icon.Upload }} onSubmit={handleImportTemplates} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title="Choose File"
        allowMultipleSelection={false}
        canChooseFiles
        canChooseDirectories={false}
      />
    </Form>
  );
};

export default ImportTemplates;
