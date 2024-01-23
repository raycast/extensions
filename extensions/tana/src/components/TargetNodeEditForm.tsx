import { Action, ActionPanel, Form, Icon, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { TanaLocalNode, updateTargetNode } from "../state";

type Values = {
  name: string;
};

type TargetNodeEditFormProps = {
  node: TanaLocalNode;
};

export function TargetNodeEditForm({ node }: TargetNodeEditFormProps) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<Values>({
    async onSubmit({ name }) {
      const toast = new Toast({ style: Toast.Style.Animated, title: "Updating target node" });
      await toast.show();
      try {
        updateTargetNode(node.id, name);
        toast.style = Toast.Style.Success;
        toast.message = "Target node updated";
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
          <Action.SubmitForm title="Edit Target Node" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Enter name" {...itemProps.name} />
    </Form>
  );
}

export function EditTargetNodeAction(props: TargetNodeEditFormProps) {
  return (
    <Action.Push title="Edit Target Node" target={<TargetNodeEditForm {...props} />} icon={{ source: Icon.Pencil }} />
  );
}
