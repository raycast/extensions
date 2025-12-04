import { Action, ActionPanel, Form, Icon, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { SupertagNode, updateSupertag } from "../state";
import { tanaColorOptions } from "../utils";

type Values = {
  name: string;
  color?: string;
};

type SuperTagEditFormProps = {
  node: SupertagNode;
};

export function SupertagEditForm({ node }: SuperTagEditFormProps) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<Values>({
    async onSubmit({ name, color }) {
      const toast = new Toast({ style: Toast.Style.Animated, title: "Updating supertag" });
      await toast.show();
      try {
        updateSupertag(node.id, { name, color });
        toast.style = Toast.Style.Success;
        toast.message = "Supertag updated";
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
      name: FormValidation.Required,
    },
    initialValues: node,
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Edit Supertag" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Enter name" {...itemProps.name} />
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

export function EditSupertagAction(props: SuperTagEditFormProps) {
  return <Action.Push title="Edit Supertag" target={<SupertagEditForm {...props} />} icon={{ source: Icon.Pencil }} />;
}
