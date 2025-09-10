import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { CustomTemplate, useCustomTemplates } from "@/hooks/useCustomTemplates";
import { CustomEntityInput, CustomEntityUpdate } from "@/types";
import { messages } from "@/locale/en/messages";
import { confirmDeletion, executeDeleteOperation } from "@/utils/confirmation";
import { validateImageUrl } from "@/utils/validation";
import { ENTITY_TYPES } from "@/constants";
import { SHORTCUTS } from "@/components/shared/utils/action-builders";
import { createInitialFormValues, handleFormSubmit, TemplateEditFormValues } from "./TemplateEditForm.helpers";

interface TemplateEditFormProps {
  template: CustomTemplate;
  onSuccess?: (createdTemplate?: CustomTemplate) => void;
  onCreate?: (templateData: CustomEntityInput<CustomTemplate>) => Promise<CustomTemplate>;
  onUpdate?: (id: string, updates: CustomEntityUpdate<CustomTemplate>) => Promise<CustomTemplate | undefined>;
  onDelete?: (id: string) => Promise<void>;
}

export function TemplateEditForm({ template, onSuccess, onCreate, onUpdate, onDelete }: TemplateEditFormProps) {
  const isEditing = !!template?.id;
  const { pop } = useNavigation();

  // Use hook only if callbacks not provided (for backward compatibility)
  const hookData = useCustomTemplates();
  const addTemplate = onCreate || hookData.addTemplate;
  const updateTemplate = onUpdate || hookData.updateTemplate;
  const deleteTemplate = onDelete || hookData.deleteTemplate;

  const handleSuccess = (createdTemplate?: CustomTemplate) => {
    if (onSuccess) {
      onSuccess(createdTemplate);
    } else {
      pop();
    }
  };

  const handleCancel = () => {
    pop();
  };

  const { handleSubmit: handleFormSubmitWrapper, itemProps } = useForm<TemplateEditFormValues>({
    async onSubmit(values) {
      await handleFormSubmit(values, template, addTemplate, updateTemplate, handleSuccess);
    },
    initialValues: createInitialFormValues(template),
    validation: {
      name: FormValidation.Required,
      instructions: FormValidation.Required,
      icon: (value) => {
        const validation = validateImageUrl(value || "");
        return validation.isValid ? undefined : validation.error;
      },
    },
  });

  const handleDelete = async () => {
    if (!template) return;

    const confirmed = await confirmDeletion(ENTITY_TYPES.TEMPLATE, template.name);
    if (!confirmed) return;

    await executeDeleteOperation(ENTITY_TYPES.TEMPLATE, template.name, async () => {
      await deleteTemplate(template.id);
    });

    handleSuccess();
  };

  return (
    <Form
      navigationTitle={
        isEditing
          ? messages.forms.navigationTitles.editTemplate.replace("{name}", template?.name || "")
          : messages.forms.navigationTitles.createTemplate
      }
      actions={
        <ActionPanel>
          {/* PRIMARY ACTIONS: No section wrapper - get automatic shortcuts (↵, ⌘↵) */}
          <Action.SubmitForm
            title={isEditing ? messages.forms.buttons.updateTemplate : messages.forms.buttons.createTemplate}
            icon={isEditing ? Icon.Pencil : Icon.Plus}
            onSubmit={handleFormSubmitWrapper}
          />
          <Action
            title={messages.forms.buttons.cancel}
            icon={Icon.XMarkCircle}
            onAction={handleCancel}
            shortcut={SHORTCUTS.CANCEL}
          />

          {/* DESTRUCTIVE ACTIONS: Separate section at bottom */}
          {isEditing && (
            <ActionPanel.Section title={messages.confirmations.dangerZone}>
              <Action
                title={messages.forms.buttons.deleteTemplate}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={handleDelete}
                shortcut={SHORTCUTS.DELETE}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    >
      <Form.Description
        text={isEditing ? messages.forms.descriptions.editTemplate : messages.forms.descriptions.createTemplate}
      />

      <Form.TextField
        title={messages.forms.titles.name}
        placeholder={messages.forms.placeholders.templateName}
        {...itemProps.name}
      />

      <Form.TextField
        title={messages.forms.titles.pictureUrl}
        placeholder={messages.forms.placeholders.pictureUrl}
        info={messages.forms.descriptions.pictureUrlHelp}
        {...itemProps.icon}
      />

      <Form.Separator />

      <Form.TextArea
        title={messages.forms.titles.instructions}
        placeholder={messages.forms.placeholders.instructions}
        info={messages.forms.descriptions.instructionsHelp}
        {...itemProps.instructions}
      />

      <Form.TextArea
        title={messages.forms.titles.requirements}
        placeholder={messages.forms.placeholders.requirements}
        info={messages.forms.descriptions.requirementsHelp}
        {...itemProps.requirements}
      />

      <Form.Separator />

      <Form.TextArea
        title={messages.forms.titles.outputInstructions}
        placeholder={messages.forms.placeholders.outputInstructions}
        info={messages.forms.descriptions.outputInstructionsHelp}
        {...itemProps.outputInstructions}
      />

      <Form.Separator />

      <Form.Description text={messages.forms.descriptions.templateSectionsHelp} />
    </Form>
  );
}

export default TemplateEditForm;
