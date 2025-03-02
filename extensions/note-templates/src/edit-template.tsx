import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useForm, FormValidation, useLocalStorage } from "@raycast/utils";
import { Template, TEMPLATES_STORAGE_KEY } from "./types";

interface EditTemplateProps {
  template: Template;
  onTemplateUpdated?: (templates: Template[]) => void;
}

interface EditTemplateFormValues {
  title: string;
  content: string;
}

export default function EditTemplate(props: EditTemplateProps) {
  const { template, onTemplateUpdated } = props;
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { value: templates = [], setValue: setTemplates } = useLocalStorage<Template[]>(TEMPLATES_STORAGE_KEY, []);

  const { handleSubmit, itemProps } = useForm<EditTemplateFormValues>({
    initialValues: {
      title: template?.title || "",
      content: template?.content || "",
    },
    onSubmit: async (values) => {
      setIsSubmitting(true);

      try {
        if (!template) {
          throw new Error("Template not found");
        }

        // Update template
        const updatedTemplates = templates.map((t) => {
          if (t.id === template.id) {
            return {
              ...t,
              title: values.title,
              content: values.content,
            };
          }
          return t;
        });

        // Save updated template list
        await setTemplates(updatedTemplates);

        showToast({
          style: Toast.Style.Success,
          title: "Template Updated",
          message: `Title: ${values.title}`,
        });

        // Notify parent component to refresh the list
        if (onTemplateUpdated) {
          onTemplateUpdated(updatedTemplates);
        }

        // Return to previous screen
        pop();
      } catch (error) {
        console.error("Error updating template:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Update Template",
          message: String(error),
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    validation: {
      title: FormValidation.Required,
    },
  });

  // Handle cancel action
  const handleCancel = () => {
    // Notify parent component to refresh the list in case there were changes
    if (onTemplateUpdated) {
      onTemplateUpdated(templates);
    }
    pop();
  };

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Update Template"
            onSubmit={handleSubmit}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          <Action title="Cancel" onAction={handleCancel} shortcut={{ modifiers: ["cmd"], key: "escape" }} />
        </ActionPanel>
      }
    >
      <Form.Description text="Edit Template" />
      <Form.TextField title="Template Title" placeholder="Enter template title" {...itemProps.title} />
      <Form.TextArea
        title="Template Content"
        placeholder="Enter template content"
        enableMarkdown
        {...itemProps.content}
      />
    </Form>
  );
}
