import { Action, ActionPanel, Color, Form, Icon, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { SupertagNode, addSuperTag } from "../state";
import { tanaColorOptions, getNodeIdFromURL } from "../utils";

type Values = {
  id: string;
  name: string;
  color?: string;
};

type SuperTagCreateFormProps = {
  onCreate?: (node: SupertagNode) => void;
};

export function SupertagCreateForm({ onCreate }: SuperTagCreateFormProps) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<Values>({
    async onSubmit({ id, name, color }) {
      id = getNodeIdFromURL(id);
      const toast = new Toast({ style: Toast.Style.Animated, title: "Adding supertag" });
      await toast.show();
      try {
        addSuperTag({ id, name, color });
        onCreate?.({ id, name });
        toast.style = Toast.Style.Success;
        toast.message = "Supertag added";
        pop();
      } catch (error) {
        let message: string | undefined = undefined;
        if (error instanceof Error) {
          message = error.message;
        }
        toast.style = Toast.Style.Failure;
        toast.message = message;
      }
    },
    validation: {
      id: FormValidation.Required,
      name: FormValidation.Required,
    },
    initialValues: { id: "", name: "", color: Color.PrimaryText },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Supertag" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Enter name" {...itemProps.name} />
      <Form.TextField title="Node ID" placeholder="Enter node ID" {...itemProps.id} />
      <Form.Dropdown title="Color" placeholder="Select color" {...itemProps.color}>
        {tanaColorOptions.map((color) => (
          <Form.Dropdown.Item
            key={color.name}
            value={color.value}
            title={color.name}
            icon={{ source: Icon.Tag, tintColor: color.value }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export function CreateSupertagAction({
  shortcut = true,
  ...props
}: SuperTagCreateFormProps & {
  shortcut?: boolean;
}) {
  return (
    <Action.Push
      title="Add Supertag"
      target={<SupertagCreateForm {...props} />}
      icon={{ source: Icon.Tag, tintColor: Color.PrimaryText }}
      shortcut={shortcut ? { modifiers: ["cmd"], key: "n" } : undefined}
    />
  );
}
