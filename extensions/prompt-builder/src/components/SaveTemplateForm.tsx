import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { validateTemplateTitle } from "../utils/validation";
import { SaveTemplateFormProps } from "../types";

const SaveTemplateForm = ({
  addTemplate,
  updateTemplate,
  selectedTemplateId,
  setSelectedTemplateId,
  templates,
  formValues,
  isUpdate = false,
  initialTitle,
}: SaveTemplateFormProps) => {
  const { pop } = useNavigation();
  const [title, setTitle] = useState(initialTitle || "");
  const [titleError, setTitleError] = useState<string | undefined>();

  const handleSave = async (values: { title: string }) => {
    try {
      const errors = validateTemplateTitle(values.title, templates);
      if (errors.title) {
        setTitleError(errors.title);
        return;
      }

      const id = await addTemplate(values.title.trim(), formValues);
      setSelectedTemplateId(id);

      await showToast({
        style: Toast.Style.Success,
        title: "Template saved",
      });

      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save template",
        message: String(error),
      });
    }
  };

  const handleUpdate = async (values: { title: string }) => {
    try {
      if (!selectedTemplateId || !updateTemplate) return;

      const errors = validateTemplateTitle(values.title, templates, selectedTemplateId);
      if (errors.title) {
        setTitleError(errors.title);
        return;
      }
      await updateTemplate(selectedTemplateId, values.title, formValues);
      await showToast({
        style: Toast.Style.Success,
        title: "Template Updated",
      });

      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update template",
        message: String(error),
      });
    }
  };

  const oldTemplate = isUpdate ? templates.find((t) => t.id === selectedTemplateId) : undefined;
  const formDescription = (() => {
    const lines: string[] = [];

    const formatValue = (value?: string | boolean) => {
      if (typeof value === "boolean") {
        return value ? "Enabled" : "Disabled";
      }
      return value;
    };

    const pushLine = (label: string, oldValue?: string | boolean, newValue?: string | boolean) => {
      const formatNewValue = formatValue(newValue);
      const formatOldValue = formatValue(oldValue);

      if (isUpdate && oldTemplate) {
        if (oldValue !== newValue) {
          const oldText = formatOldValue ? `${formatOldValue}` : "--";
          const newText = formatNewValue ? `${formatNewValue}` : "--";
          lines.push(`• ${label}: ${oldText} → ${newText}`);
        }
      } else if (newValue) {
        if (newValue !== "None") lines.push(`• ${label}: ${formatNewValue}`);
      }
    };

    pushLine("Role", oldTemplate?.role, formValues.role);
    pushLine("Task", oldTemplate?.task, formValues.task);
    pushLine("Reference", oldTemplate?.reference, formValues.reference);
    pushLine("Format", oldTemplate?.format, formValues.format);

    pushLine("Tone", oldTemplate?.tone, formValues.tone);
    pushLine("Audience", oldTemplate?.audience, formValues.audience);
    pushLine("Creativity", oldTemplate?.creativity, formValues.creativity);
    pushLine("Example", oldTemplate?.example, formValues.example);
    pushLine("Meta", oldTemplate?.meta, formValues.meta);

    pushLine("Reasoning", oldTemplate?.reasoning, formValues.reasoning);
    pushLine("Sources", oldTemplate?.sources, formValues.sources);
    pushLine("Summary", oldTemplate?.summary, formValues.summary);
    pushLine("Avoid em-dashes", oldTemplate?.noEmDash, formValues.noEmDash);

    if (lines.length === 0) {
      return isUpdate ? "No changes detected in this template." : "You are about to save an empty template.";
    }

    return isUpdate
      ? `You are about to update this template with the following changes:\n\n${lines.join("\n")}`
      : `You are about to save a template with:\n\n${lines.join("\n")}`;
  })();

  return (
    <Form
      navigationTitle={isUpdate ? "Update Template" : "Save Template"}
      actions={
        <ActionPanel>
          {isUpdate ? (
            <Action.SubmitForm title="Update Template" onSubmit={handleUpdate} />
          ) : (
            <Action.SubmitForm title="Save Template" onSubmit={handleSave} />
          )}
        </ActionPanel>
      }
    >
      <Form.Description text={isUpdate ? "Update template" : "Save as Template"} />

      <Form.TextField
        id="title"
        title="Template Title"
        value={title}
        onChange={(v) => {
          setTitle(v);
          if (titleError && titleError.length > 0) setTitleError(undefined);
        }}
        error={titleError}
      />

      <Form.Description title="Template Summary" text={formDescription} />
    </Form>
  );
};

export default SaveTemplateForm;
