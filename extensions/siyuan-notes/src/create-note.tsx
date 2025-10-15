import { useState, useEffect } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
  Icon,
  LaunchProps,
} from "@raycast/api";
import { siyuanAPI } from "./api/siyuan";
import { SiYuanNotebook, SiYuanTemplate } from "./types";

interface FormValues {
  title: string;
  content: string;
  notebook: string;
  template?: string;
  path?: string;
}

interface Arguments {
  title?: string;
  content?: string;
}

export default function CreateNote(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const { title: initialTitle, content: initialContent } = props.arguments;

  const [notebooks, setNotebooks] = useState<SiYuanNotebook[]>([]);
  const [templates, setTemplates] = useState<SiYuanTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load notebooks first, templates are optional
      const notebooksData = await siyuanAPI.getNotebooks();
      setNotebooks(notebooksData.filter((nb) => !nb.closed));

      // Try to load templates, but don't affect main functionality
      try {
        const templatesData = await siyuanAPI.getTemplates();
        setTemplates(templatesData);
      } catch (templateError) {
        console.log(
          "Template loading failed, but doesn't affect note creation:",
          templateError,
        );
        setTemplates([]);
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Notebooks",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: FormValues) => {
    if (!values.title.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please Enter Note Title",
      });
      return;
    }

    if (!values.notebook) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please Select Notebook",
      });
      return;
    }

    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating Note...",
      });

      let docId: string;

      const notePath = values.path || `/${values.title}`;

      if (values.template) {
        docId = await siyuanAPI.createNoteWithTemplate({
          notebook: values.notebook,
          path: notePath,
          title: values.title,
          content: values.content,
          templateId: values.template,
        });
      } else {
        docId = await siyuanAPI.createNote({
          notebook: values.notebook,
          path: notePath,
          title: values.title,
          content: values.content,
        });
      }

      toast.style = Toast.Style.Success;
      toast.title = "Note Created Successfully";
      toast.message = `ID: ${docId}`;

      // Don't auto-open after creation, user can view via search
      // Avoid using window.open as it's not available in Raycast environment

      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Create Note",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  if (loading) {
    return (
      <Form
        isLoading={true}
        actions={
          <ActionPanel>
            <Action title="Loading…" />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Plus}
            title="Create Note"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Enter note title"
        defaultValue={initialTitle || ""}
      />

      <Form.Dropdown
        id="notebook"
        title="Notebook"
        placeholder="Select notebook"
        defaultValue={notebooks[0]?.id}
        storeValue
      >
        {notebooks.map((notebook) => (
          <Form.Dropdown.Item
            key={notebook.id}
            value={notebook.id}
            title={notebook.name}
            icon={notebook.icon || Icon.Folder}
          />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="path"
        title="Path"
        placeholder="Optional: Custom document path (e.g., /folder/filename)"
        info="Leave empty to use title as filename"
      />

      {templates.length > 0 && (
        <Form.Dropdown
          id="template"
          title="Template"
          placeholder="Select template (optional)"
        >
          <Form.Dropdown.Item value="" title="No Template" />
          {templates.map((template) => (
            <Form.Dropdown.Item
              key={template.id}
              value={template.id}
              title={template.name}
            />
          ))}
        </Form.Dropdown>
      )}

      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Enter note content (Markdown format)"
        defaultValue={initialContent || ""}
        enableMarkdown
      />
    </Form>
  );
}
