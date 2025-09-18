import { ActionPanel, List, Action, Icon, Toast, showToast, Clipboard, useNavigation } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { useLocalStorage } from "@raycast/utils";
import { Template, TEMPLATES_STORAGE_KEY } from "./types";
import EditTemplate from "./edit-template";
import CreateTemplate from "./create-a-template";

export default function Command() {
  const {
    value: templates = [],
    setValue: setTemplates,
    isLoading: isLoadingTemplates,
  } = useLocalStorage<Template[]>(TEMPLATES_STORAGE_KEY, []);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const { push } = useNavigation();

  // Set initial selected template when templates are loaded
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates[0].id);
    } else if (templates.length === 0) {
      setSelectedTemplateId(null);
    }
  }, [templates, selectedTemplateId]);

  const refreshTemplates = useCallback((templates?: Template[]) => {
    if (templates) {
      setTemplates(templates);
    }
  }, []);

  async function handleCopyContent(content: string) {
    await Clipboard.copy(content);
    showToast({
      style: Toast.Style.Success,
      title: "Copied to Clipboard",
    });
  }

  async function handleDeleteTemplate(id: string) {
    try {
      const updatedTemplates = templates.filter((template) => template.id !== id);
      await setTemplates(updatedTemplates);

      // If the deleted template was selected, select the first template (if any)
      if (id === selectedTemplateId && updatedTemplates.length > 0) {
        setSelectedTemplateId(updatedTemplates[0].id);
      } else if (updatedTemplates.length === 0) {
        setSelectedTemplateId(null);
      }

      showToast({
        style: Toast.Style.Success,
        title: "Template Deleted",
      });
    } catch (error) {
      console.error("Error deleting template:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Delete Template",
        message: String(error),
      });
    }
  }

  return (
    <List
      isLoading={isLoadingTemplates}
      searchBarPlaceholder="Search templates..."
      isShowingDetail={templates.length > 0}
      onSelectionChange={(id) => {
        if (id) {
          setSelectedTemplateId(id);
        }
      }}
    >
      {templates.length === 0 && !isLoadingTemplates ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No Templates"
          description="Create a template first"
          actions={
            <ActionPanel>
              <Action
                title="Create a Template"
                icon={Icon.Plus}
                onAction={() => {
                  push(<CreateTemplate onTemplateCreated={refreshTemplates} />);
                }}
              />
            </ActionPanel>
          }
        />
      ) : (
        templates.map((template) => (
          <List.Item
            key={template.id}
            id={template.id}
            icon={Icon.Document}
            title={template.title}
            detail={<List.Item.Detail markdown={template.content} />}
            actions={
              <ActionPanel>
                <Action
                  title="Copy Content"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                  onAction={() => handleCopyContent(template.content)}
                />
                <Action.Push
                  title="Edit Template"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  target={<EditTemplate template={template} onTemplateUpdated={refreshTemplates} />}
                />
                <Action
                  title="Create New Template"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() => {
                    push(<CreateTemplate onTemplateCreated={refreshTemplates} />);
                  }}
                />
                <Action
                  title="Delete Template"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() => handleDeleteTemplate(template.id)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
