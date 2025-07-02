import { Form, ActionPanel, Action, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import getCategories from "../tools/getCategories";
import { Category } from "../types/category";
import createTemplate from "../tools/createTemplate";
import { generateRandomId } from "../utils/generateRandomId";
export default function CreateTemplateForm() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [templateType, setTemplateType] = useState<string>("command");

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Template"
            onSubmit={async (values) => {
              createTemplate({
                id: generateRandomId(),
                name: values.name,
                category: values.category,
                type: values.type,
                command: values.command,
                templatePath: values.templatePath,
                autoCreateRepo: values.autoCreateRepo,
                setupCommand: values.setupCommand,
              });
              popToRoot();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Template Name" />
      <Form.Dropdown id="category" title="Category">
        {categories.map((category) => (
          <Form.Dropdown.Item key={category.name} value={category.name} title={category.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="type" title="Template Type" onChange={setTemplateType}>
        <Form.Dropdown.Item value="command" title="Command" />
        <Form.Dropdown.Item value="template" title="Template" />
      </Form.Dropdown>

      {templateType === "command" && <Form.TextField id="command" title="Command" />}
      {templateType === "template" && (
        <Form.FilePicker
          id="templatePath"
          title="Template Path"
          canChooseDirectories
          canChooseFiles={false}
          allowMultipleSelection={false}
          info="Select a template folder"
        />
      )}

      <Form.Checkbox id="autoCreateRepo" label="Automatically Create Git Repository" />
      <Form.TextField id="setupCommand" title="Setup Command" />
    </Form>
  );
}
