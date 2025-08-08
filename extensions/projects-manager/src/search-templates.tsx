import { List, ActionPanel, Action, Icon, Alert, confirmAlert } from "@raycast/api";
import { useState, useEffect } from "react";
import getCategories from "./tools/getCategories";
import getAllTemplates from "./tools/getAllTemplates";
import deleteTemplate from "./tools/deleteTemplate";
import { Category } from "./types/category";
import { Template } from "./types/template";
import EditTemplateForm from "./forms/editTemplateForm";

export default function Command() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  useEffect(() => {
    getCategories().then(setCategories);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    getAllTemplates().then(setTemplates);
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Category"
          value={selectedCategory || ""}
          onChange={(value) => {
            setSelectedCategory(value);
          }}
        >
          {categories.map((category) => (
            <List.Dropdown.Item
              key={category.name}
              title={category.name}
              value={category.name}
              icon={category.imagePath}
            />
          ))}
        </List.Dropdown>
      }
      onSearchTextChange={(text) => {
        setSearchText(text);
      }}
    >
      {templates
        .filter(
          (template) =>
            template.category === selectedCategory && template.name.toLowerCase().includes(searchText.toLowerCase()),
        )
        .map((template) => (
          <List.Item
            key={template.name}
            title={template.name}
            icon={template.type === "template" ? "📂" : "💻"}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Template"
                  icon={Icon.Pencil}
                  target={<EditTemplateForm template={template} />}
                />
                <Action
                  title="Delete Template"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={async () => {
                    const options: Alert.Options = {
                      title: "Delete Template",
                      message: `Are you sure you want to delete "${template.name}"? This action cannot be undone.`,
                      primaryAction: {
                        title: "Delete",
                        style: Alert.ActionStyle.Destructive,
                        onAction: async () => {
                          const success = await deleteTemplate({ template });
                          if (success) {
                            // Refresh the templates list
                            const updatedTemplates = await getAllTemplates();
                            setTemplates(updatedTemplates);
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
          />
        ))}
    </List>
  );
}
