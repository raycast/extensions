import { Form, ActionPanel, LocalStorage, Action, Grid, showToast, Toast } from "@raycast/api";
import { Category } from "./types/category";
import { useEffect, useState } from "react";
import { Template } from "./types/template";
import createProject from "./tools/createProject";
import getAllTemplates from "./tools/getAllTemplates";

type Values = {
  name: string;
  category: string;
  template: Template;
  createRepo: boolean;
  description: string;
};

export default function Command() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    loadCategoriesAndProjects();
    loadTemplates();
  }, []);

  async function loadTemplates() {
    const templates = await getAllTemplates();
    setTemplates(templates);
  }

  async function loadCategoriesAndProjects() {
    try {
      const storedCategories = await LocalStorage.getItem("categories");
      if (storedCategories) {
        const parsedCategories = JSON.parse(storedCategories as string);
        setCategories(parsedCategories);
      }
    } catch (error) {
      console.error("Failed to load categories and projects:", error);
    }
  }

  async function handleSubmit(values: Values) {
    const name = values.name;
    const category = values.category;
    const createRepo = values.createRepo;
    const description = values.description;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating project",
    });

    console.log(values.template);

    await createProject({
      name: name,
      category: category,
      template: values.template,
      autoCreateRepo: createRepo,
      description: description,
    });

    toast.title = "Project created";
    toast.message = name;
    toast.style = Toast.Style.Success;
  }

  return (
    <Grid>
      {categories.map((category) => (
        <Grid.Item
          key={category.name}
          title={category.name}
          content={category.imagePath}
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Project"
                target={
                  <Form
                    actions={
                      <ActionPanel>
                        <Action.SubmitForm
                          onSubmit={(values) => {
                            const foundTemplate = templates.find((template) => template.id === values.template);
                            if (foundTemplate) {
                              handleSubmit({
                                ...values,
                                category: category.name,
                                template: foundTemplate,
                              });
                            }
                          }}
                        />
                      </ActionPanel>
                    }
                  >
                    <Form.TextField id="name" title="Enter Project Name" placeholder="" defaultValue="" />
                    <Form.Dropdown id="template" title="Select Template">
                      {templates
                        .filter((template) => template.category === category.name)
                        .map((template) => (
                          <Form.Dropdown.Item
                            key={template.id}
                            title={template.name}
                            value={template.id}
                            icon={template.templatePath ? "📂" : "💻"}
                          />
                        ))}
                    </Form.Dropdown>
                    <Form.TextField id="description" title="Enter Project Description" placeholder="" defaultValue="" />
                    <Form.Checkbox id="createRepo" label="Create Git Repository" defaultValue={false} />
                  </Form>
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
