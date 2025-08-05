import { Action, ActionPanel, Form, Icon, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { TanaLocalNode, addTargetNode } from "../state";
import { getNodeIdFromURL } from "../utils";

type Values = {
  id: string;
  name: string;
};

type TargetNodeCreateFormProps = {
  onCreate?: (node: TanaLocalNode) => void;
};

export function TargetNodeCreateForm({ onCreate }: TargetNodeCreateFormProps) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<Values>({
    async onSubmit({ id, name }) {
      id = getNodeIdFromURL(id);
      const toast = new Toast({ style: Toast.Style.Animated, title: "Adding node" });
      await toast.show();
      try {
        addTargetNode({ id, name });
        onCreate?.({ id, name });
        toast.style = Toast.Style.Success;
        toast.message = "Node added";
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
    initialValues: { id: "", name: "" },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={`Create target node`} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Node ID" placeholder={"Enter node ID"} {...itemProps.id} />
      <Form.TextField title="Name" placeholder="Enter name" {...itemProps.name} />
    </Form>
  );
}

export function CreateTargetNodeAction({
  shortcut = true,
  ...props
}: TargetNodeCreateFormProps & {
  shortcut?: boolean;
}) {
  return (
    <Action.Push
      title="Add Target Node"
      target={<TargetNodeCreateForm {...props} />}
      icon={Icon.Dot}
      shortcut={shortcut ? { modifiers: ["cmd"], key: "n" } : undefined}
    />
  );
}
