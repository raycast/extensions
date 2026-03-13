import { Action, ActionPanel, captureException, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import type { StackFieldInput, StackFieldType } from "../types";
import { slugify } from "../utils/slugify";
import { addFieldToStack } from "../utils/stacks";

type Values = {
  label: string;
  description: string;
  type: string;
  isTitleField: boolean;
};

export const NewStackFieldForm = ({ stackId, onAdd }: { stackId: string; onAdd: () => void }) => {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<Values>({
    async onSubmit(values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Adding new field...",
      });

      try {
        const newField: StackFieldInput = {
          label: {
            key: slugify(values.label.trim()),
            value: values.label.trim(),
          },
          description: values.description.trim(),
          type: values.type as StackFieldType,
          isTitleField: values.isTitleField,
        };

        await addFieldToStack(stackId, newField);

        toast.style = Toast.Style.Success;
        toast.title = `Stack field ${values.label} created`;

        onAdd();
        pop();
      } catch (error) {
        captureException(error);
        toast.style = Toast.Style.Failure;
        toast.title = "Could not add field";
      }
    },
    validation: {
      label: FormValidation.Required,
      description: FormValidation.Required,
      type: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Stack Field" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Add a new field to your stack" />
      <Form.TextField title="Label" placeholder="Name" {...itemProps.label} />
      <Form.TextArea
        title="Field description"
        placeholder="Provide a detailed description of your field"
        {...itemProps.description}
      />
      <Form.Dropdown title="Type" defaultValue="text" {...itemProps.type}>
        <Form.Dropdown.Item value="text" title="Text" icon={Icon.Text} />
        <Form.Dropdown.Item value="number" title="Number" icon={Icon.PlusMinusDivideMultiply} />
        <Form.Dropdown.Item value="date" title="Date" icon={Icon.Calendar} />
        <Form.Dropdown.Item value="time" title="Time" icon={Icon.Clock} />
        <Form.Dropdown.Item value="currency" title="Currency" icon={Icon.Coins} />
        <Form.Dropdown.Item value="boolean" title="Boolean" icon={Icon.CheckCircle} />
      </Form.Dropdown>
      <Form.Checkbox
        label="This field will be used to generate the title of the capture"
        title="Title Field"
        {...itemProps.isTitleField}
      />
    </Form>
  );
};
