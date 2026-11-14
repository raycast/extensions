import { Action, ActionPanel, Form } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { moveTo } from "./api";
import { describe, Position } from "./format";
import { integerIn } from "./validation";

type Values = { distance: string; rotation: string };

export default function Move(props: { position: Position }) {
  const { handleSubmit, itemProps } = useForm<Values>({
    initialValues: { distance: String(props.position.distance), rotation: String(props.position.rotation) },
    validation: { distance: integerIn(0, 100), rotation: integerIn(-100, 100) },
    onSubmit: ({ distance, rotation }) => {
      const position = { distance: Number(distance), rotation: Number(rotation) };
      return moveTo(describe(position), position);
    },
  });

  return (
    <Form
      navigationTitle="Exact Position"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Move" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Distance" placeholder="0 (wall) to 100" {...itemProps.distance} />
      <Form.TextField title="Rotation" placeholder="-100 (left) to 100 (right)" {...itemProps.rotation} />
      <Form.Description text="Rotation can never exceed distance: the TV cannot turn while it is against the wall." />
    </Form>
  );
}
