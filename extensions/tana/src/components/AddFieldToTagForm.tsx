import { Action, ActionPanel, Form, Icon, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { FieldDataType, TanaTag } from "../api/contracts";
import { createPreferenceClient } from "../api/preferenceClient";
import { addFieldToTag } from "../api/tanaService";

type Values = { name: string; description?: string; dataType: string; options?: string; isMultiValue: boolean };

export function AddFieldToTagForm({
  tag,
  workspaceId,
  onComplete,
}: {
  tag: TanaTag;
  workspaceId: string;
  onComplete?: () => void;
}) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<Values>({
    async onSubmit(values) {
      const toast = new Toast({ style: Toast.Style.Animated, title: "Adding field" });
      await toast.show();
      try {
        const options = values.options
          ?.split(",")
          .map((option) => option.trim())
          .filter(Boolean);
        await addFieldToTag(createPreferenceClient(workspaceId), tag.id, {
          ...values,
          dataType: values.dataType as FieldDataType,
          options,
        });
        toast.style = Toast.Style.Success;
        toast.message = `${values.name} added`;
        onComplete?.();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.message = error instanceof Error ? error.message : "Unknown error";
      }
    },
    validation: { name: FormValidation.Required },
    initialValues: { name: "", description: "", dataType: "plain", options: "", isMultiValue: false },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Field" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Supertag" text={tag.name} />
      <Form.TextField title="Field Name" placeholder="Status" {...itemProps.name} />
      <Form.TextArea title="Description" placeholder="Optional description" {...itemProps.description} />
      <Form.Dropdown title="Data Type" {...itemProps.dataType}>
        {(["plain", "number", "date", "url", "email", "checkbox", "user", "instance", "options"] as const).map(
          (type) => (
            <Form.Dropdown.Item key={type} value={type} title={type} />
          ),
        )}
      </Form.Dropdown>
      <Form.TextField
        title="Options"
        placeholder="Open, In progress, Done (options fields only)"
        {...itemProps.options}
      />
      <Form.Checkbox label="Allow multiple values" {...itemProps.isMultiValue} />
    </Form>
  );
}

export function AddFieldToTagAction(props: Parameters<typeof AddFieldToTagForm>[0]) {
  return <Action.Push title="Add Field" icon={Icon.Plus} target={<AddFieldToTagForm {...props} />} />;
}
