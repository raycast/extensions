import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation, useLocalStorage } from "@raycast/utils";
import { useState } from "react";
import { Template, TEMPLATES_STORAGE_KEY } from "./types";

interface TemplateFormValues {
  templateTitle: string;
  templateContent: string;
}

export default function Command({ onTemplateCreated }: { onTemplateCreated: (templates: Template[]) => void }) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const {
    value: templates = [],
    setValue: setTemplates,
    isLoading: isLoadingTemplates,
  } = useLocalStorage<Template[]>(TEMPLATES_STORAGE_KEY, []);
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<TemplateFormValues>({
    onSubmit: async (values) => {
      setIsSubmitting(true);

      try {
        // Create new template
        const newTemplate: Template = {
          id: Date.now().toString(), // Use timestamp as ID to avoid uuid dependency
          title: values.templateTitle,
          content: values.templateContent,
          createdAt: new Date().toISOString(),
        };

        const updatedTemplates = [...templates, newTemplate];
        // Add new template to the list and save
        await setTemplates(updatedTemplates);

        showToast({
          style: Toast.Style.Success,
          title: "Template Created",
          message: `Title: ${values.templateTitle}`,
        });
        onTemplateCreated(updatedTemplates);
        pop();
      } catch (error) {
        console.error("Error saving template:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Save Template",
          message: String(error),
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    validation: {
      templateTitle: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isSubmitting || isLoadingTemplates}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Template" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new template" />
      <Form.TextField title="Template Title" placeholder="Enter template title" {...itemProps.templateTitle} />
      <Form.TextArea
        title="Template Content"
        placeholder="Enter template content"
        enableMarkdown
        {...itemProps.templateContent}
      />
    </Form>
  );
}
