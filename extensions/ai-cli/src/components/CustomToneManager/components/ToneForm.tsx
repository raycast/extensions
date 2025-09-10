import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { CustomTone } from "@/hooks/useCustomTones";
import { messages } from "@/locale/en/messages";
import { handleCreateUpdateOperation } from "@/forms/form-operations";
import { confirmDeletion, executeDeleteOperation } from "@/utils/confirmation";
import { validateImageUrl } from "@/utils/validation";
import { ENTITY_TYPES } from "@/constants";
import { SHORTCUTS } from "@/components/shared/utils/action-builders";

interface ToneFormValues {
  name: string;
  guidelines: string;
  icon: string;
}

interface ToneFormProps {
  tone: CustomTone;
  onSuccess: (createdTone?: CustomTone) => void;
  onCancel: () => void;
  onCreate?: (toneData: ToneFormValues) => Promise<CustomTone>;
  onUpdate?: (id: string, updates: ToneFormValues) => Promise<CustomTone | undefined>;
  onDelete?: (tone: CustomTone) => void;
}

export default function ToneForm({ tone, onSuccess, onCancel, onCreate, onUpdate, onDelete }: ToneFormProps) {
  const isEditing = !!tone.id;

  const { handleSubmit, itemProps } = useForm<ToneFormValues>({
    async onSubmit(values) {
      if (!onCreate || !onUpdate) {
        throw new Error("onCreate and onUpdate callbacks are required");
      }

      const result = await handleCreateUpdateOperation({
        isEditing,
        itemName: values.name,
        createOperation: () => onCreate(values),
        updateOperation: () => onUpdate(tone.id, values),
        messages: {
          createSuccessTitle: messages.toast.toneCreated,
          updateSuccessTitle: messages.toast.toneUpdated,
          createErrorTitle: messages.toast.toneCreateFailed,
          updateErrorTitle: messages.toast.toneUpdateFailed,
        },
      });

      if (result.success) {
        onSuccess(result.data || tone);
      }
    },
    initialValues: {
      name: tone.name || "",
      guidelines: tone.guidelines || "",
      icon: tone.icon || "",
    },
    validation: {
      name: FormValidation.Required,
      guidelines: FormValidation.Required,
      icon: (value) => {
        const validation = validateImageUrl(value || "");
        return validation.isValid ? undefined : validation.error;
      },
    },
  });

  const handleDelete = async () => {
    if (!onDelete) return;

    const confirmed = await confirmDeletion(ENTITY_TYPES.TONE, tone.name);
    if (!confirmed) return;

    await executeDeleteOperation(ENTITY_TYPES.TONE, tone.name, () => {
      onDelete(tone);
      return Promise.resolve();
    });

    onSuccess();
  };

  return (
    <Form
      navigationTitle={
        isEditing
          ? messages.forms.navigationTitles.editTone.replace("{name}", tone.name)
          : messages.forms.navigationTitles.createTone
      }
      actions={
        <ActionPanel>
          {/* PRIMARY ACTIONS: No section wrapper - get automatic shortcuts (↵, ⌘↵) */}
          <Action.SubmitForm
            title={isEditing ? messages.forms.buttons.updateTone : messages.forms.buttons.createTone}
            icon={isEditing ? Icon.Pencil : Icon.Plus}
            onSubmit={handleSubmit}
          />
          <Action
            title={messages.forms.buttons.cancel}
            icon={Icon.XMarkCircle}
            onAction={onCancel}
            shortcut={SHORTCUTS.CANCEL}
          />

          {/* DESTRUCTIVE ACTIONS: Separate section at bottom */}
          {isEditing && onDelete && (
            <ActionPanel.Section title={messages.confirmations.dangerZone}>
              <Action
                title={messages.forms.buttons.deleteTone}
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
        text={isEditing ? messages.forms.descriptions.editTone : messages.forms.descriptions.createTone}
      />

      <Form.TextField
        title={messages.forms.titles.name}
        placeholder={messages.forms.placeholders.toneName}
        {...itemProps.name}
      />

      <Form.TextField
        title={messages.forms.titles.pictureUrl}
        placeholder={messages.forms.placeholders.pictureUrl}
        info={messages.forms.descriptions.pictureUrlHelp}
        {...itemProps.icon}
      />

      <Form.TextArea
        title={messages.forms.titles.guidelines}
        placeholder={messages.forms.placeholders.toneGuidelines}
        {...itemProps.guidelines}
      />

      <Form.Separator />

      <Form.Description text={messages.forms.descriptions.guidelinesHelp} />
    </Form>
  );
}
