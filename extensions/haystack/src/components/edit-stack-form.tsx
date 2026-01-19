import { Action, ActionPanel, captureException, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import type { StackInput } from "../types";
import { slugify } from "../utils/slugify";
import { updateStack } from "../utils/stacks";

type Values = {
  name: string;
  icon: string;
  description: string;
};

export const EditStackForm = ({
  name,
  icon,
  description,
  id,
  onUpdate,
}: {
  name: string;
  icon: string;
  description: string;
  id: string;
  onUpdate: () => void;
}) => {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<Values>({
    async onSubmit(values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Updating a stack for "${values.name}"`,
      });

      try {
        const updatedStack: Partial<StackInput> = {
          name: {
            key: slugify(values.name.trim()),
            value: values.name.trim(),
          },
          icon: values.icon,
          description: values.description.trim(),
        };

        await updateStack(id, updatedStack);
        onUpdate();

        toast.style = Toast.Style.Success;
        toast.title = `"${values.name}" stack updated`;
        pop();
      } catch (error) {
        captureException(error);
        toast.style = Toast.Style.Failure;
        toast.title = "Could not update stack";
      }
    },
    validation: {
      name: FormValidation.Required,
      icon: FormValidation.Required,
      description: FormValidation.Required,
    },
    initialValues: {
      name,
      icon,
      description,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Stack" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Edit a stack you already created." />
      <Form.TextField title="Name" placeholder="Plane tickets" {...itemProps.name} />
      <Form.Dropdown title="Icon" {...itemProps.icon}>
        {Array.from(new Set(Object.values(Icon))).map((icon) => (
          <Form.Dropdown.Item key={icon} value={icon} title={icon} icon={icon} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        title="Description"
        placeholder="Prices and airlines for my planned trips"
        info="Haystack AI would use this description to better understand what is stored in this stack."
        {...itemProps.description}
      />
    </Form>
  );
};
