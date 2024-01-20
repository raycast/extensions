import { Action, ActionPanel, Color, Form, Icon, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { TanaLocalNode, addTargetNode } from "../state";

type Values = {
  id: string;
  name: string;
};

export function TargetNodeForm({ node, onAdd }: { node?: TanaLocalNode; onAdd?: (node: TanaLocalNode) => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<Values>({
    async onSubmit({ id, name }) {
      id = getNodeId(id);
      const toast = new Toast({ style: Toast.Style.Animated, title: "Adding node" });
      await toast.show();
      try {
        addTargetNode({ id, name });
        onAdd?.({ id, name });
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
    initialValues: node ?? { id: "", name: "" },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add target node" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Enter name" {...itemProps.name} />
      <Form.TextField title="Node ID" placeholder="Enter node ID" {...itemProps.id} />
    </Form>
  );
}

export function AddTargetNodeAction({
  node,
  onAdd,
  shortcut = true,
}: {
  node?: TanaLocalNode;
  shortcut?: boolean;
  onAdd?: (node: TanaLocalNode) => void;
}) {
  return (
    <Action.Push
      title="Add target node"
      target={<TargetNodeForm node={node} onAdd={onAdd} />}
      icon={{ source: Icon.Dot, tintColor: Color.PrimaryText }}
      shortcut={shortcut ? { modifiers: ["cmd"], key: "n" } : undefined}
    />
  );
}

export function EditTargetNodeAction(props: { node?: TanaLocalNode }) {
  return <Action.Push title="Edit target node" target={<TargetNodeForm {...props} />} icon={{ source: Icon.Pencil }} />;
}

function getNodeId(value: string) {
  if (value.startsWith("https://")) {
    const url = new URL(value);
    const nodeId = url.searchParams.get("nodeid");
    if (!nodeId) {
      throw new Error("Node ID not found in URL");
    }
    return nodeId;
  }
  return value;
}
