import { Form, ActionPanel, Action, popToRoot, LocalStorage, Icon, Alert, confirmAlert } from "@raycast/api";
import { useEffect, useState } from "react";
import getCategories from "../tools/getCategories";
import getAllTemplates from "../tools/getAllTemplates";
import deleteTemplate from "../tools/deleteTemplate";
import { Category } from "../types/category";
import { Template } from "../types/template";

export default function EditTemplateForm(props: { template: Template }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [templateType, setTemplateType] = useState<string>(props.template.type);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Template"
            icon={Icon.Check}
            onSubmit={async (values) => {
              const templates = await getAllTemplates();
              const templateIndex = templates.findIndex((t) => t.id === props.template.id);
              if (templateIndex !== -1) {
                templates[templateIndex] = {
                  ...props.template,
                  name: values.name,
                  category: values.category,
                  type: values.type,
                  command: values.command,
                  templatePath: values.templatePath,
                  autoCreateRepo: values.autoCreateRepo,
                  setupCommand: values.setupCommand,
                };
              }
              await LocalStorage.setItem("templates", JSON.stringify(templates));
              popToRoot();
            }}
          />
          <Action
            title="Delete Template"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={async () => {
              const options: Alert.Options = {
                title: "Delete Template",
                message: `Are you sure you want to delete "${props.template.name}"? This action cannot be undone.`,
                primaryAction: {
                  title: "Delete",
                  style: Alert.ActionStyle.Destructive,
                  onAction: async () => {
                    const success = await deleteTemplate({ template: props.template });
                    if (success) {
                      popToRoot();
                    }
                  },
                },
                dismissAction: {
                  title: "Cancel",
                },
              };
              await confirmAlert(options);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Template Name" defaultValue={props.template.name} />
      <Form.Dropdown id="category" title="Category" defaultValue={props.template.category}>
        {categories.map((category) => (
          <Form.Dropdown.Item key={category.name} value={category.name} title={category.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="type" title="Template Type" defaultValue={props.template.type} onChange={setTemplateType}>
        <Form.Dropdown.Item value="command" title="Command" />
        <Form.Dropdown.Item value="template" title="Template" />
      </Form.Dropdown>

      {templateType === "command" && (
        <Form.TextField id="command" title="Command" defaultValue={props.template.command} />
      )}
      {templateType === "template" && (
        <Form.FilePicker
          id="templatePath"
          title="Template Path"
          canChooseDirectories
          canChooseFiles={false}
          allowMultipleSelection={false}
          info="Select a template folder"
          defaultValue={
            Array.isArray(props.template.templatePath)
              ? props.template.templatePath
              : props.template.templatePath
                ? [props.template.templatePath]
                : undefined
          }
        />
      )}

      <Form.Checkbox
        id="autoCreateRepo"
        label="Automatically Create Git Repository"
        defaultValue={props.template.autoCreateRepo}
      />
      <Form.TextField id="setupCommand" title="Setup Command" defaultValue={props.template.setupCommand} />
    </Form>
  );
}
