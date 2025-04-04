import { ActionPanel, Action, List, showToast, Toast, Icon, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import {
  TEMPLATES,
  NoteTemplate,
  createFromTemplate,
  vectorIndex,
  generateEmbedding,
  generateId,
  extractDataFromText,
} from "./utils";

function TemplateForm({ template }: { template: NoteTemplate }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  // Create form fields based on template content
  const extractFormFields = (templateContent: string): { id: string; title: string }[] => {
    const fields: { id: string; title: string }[] = [];
    const regex = /([A-Za-z ]+):\s*$/gm;
    let match;

    while ((match = regex.exec(templateContent)) !== null) {
      const fieldName = match[1].trim();
      const fieldId = fieldName.toLowerCase().replace(/\s+/g, "_");
      fields.push({ id: fieldId, title: fieldName });
    }

    return fields;
  };

  const formFields = extractFormFields(template.template);

  async function handleSubmit(values: Record<string, string>) {
    try {
      setIsLoading(true);

      // Create note content from template
      const content = createFromTemplate(template.id, values);

      // Extract data from content
      const extractedData = extractDataFromText(content);

      // Generate vector embedding
      const embedding = generateEmbedding(content);

      // Generate unique ID
      const id = generateId();

      // Store the note in Upstash Vector
      await vectorIndex.upsert([
        {
          id,
          vector: embedding,
          metadata: {
            text: content,
            isUrl: false,
            category: template.category,
            extractedData: JSON.stringify(extractedData),
            timestamp: new Date().toISOString(),
            template: {
              id: template.id,
              name: template.name,
            },
          },
        },
      ]);

      // Show success toast
      await showToast({
        style: Toast.Style.Success,
        title: "Note created from template",
        message: `${template.name} saved successfully`,
      });

      // Navigate back to template selection
      pop();
    } catch (error) {
      console.error("Error creating note from template:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error creating note",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Note" onSubmit={handleSubmit} icon={Icon.SaveDocument} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.Description title={template.name} text={template.description} />

      {formFields.map((field) => (
        <Form.TextField
          key={field.id}
          id={field.id}
          title={field.title}
          placeholder={`Enter ${field.title.toLowerCase()}`}
        />
      ))}

      <Form.TextArea id="additional_notes" title="Additional Notes" placeholder="Add any extra information" />

      <Form.Separator />

      <Form.Description
        title="Preview"
        text={`Your note will be saved using the ${template.name} template with the information you provided.`}
      />
    </Form>
  );
}

export default function Command() {
  const { push } = useNavigation();

  return (
    <List>
      {TEMPLATES.map((template) => (
        <List.Item
          key={template.id}
          icon={template.icon}
          title={template.name}
          subtitle={template.description}
          accessories={[{ text: template.category }]}
          actions={
            <ActionPanel>
              <Action
                title="Use Template"
                onAction={() => push(<TemplateForm template={template} />)}
                icon={Icon.Document}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
