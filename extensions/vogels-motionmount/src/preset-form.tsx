import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { addPreset, Position, Preset, updatePreset } from "./api";
import { integerIn, presetName } from "./validation";

type Values = { name: string; distance: string; rotation: string };

export default function PresetForm(props: { preset?: Preset; position: Position; onSaved: () => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<Values>({
    initialValues: {
      name: props.preset?.name ?? "",
      distance: String(props.position.distance),
      rotation: String(props.position.rotation),
    },
    validation: { name: presetName, distance: integerIn(0, 100), rotation: integerIn(-100, 100) },
    onSubmit: async (values) => {
      const name = values.name.trim();
      const position = { distance: Number(values.distance), rotation: Number(values.rotation) };
      const toast = await showToast({ style: Toast.Style.Animated, title: `Saving ${name}…` });
      try {
        await (props.preset ? updatePreset(props.preset.index, name, position) : addPreset(name, position));
        toast.style = Toast.Style.Success;
        toast.title = `Saved ${name}`;
        props.onSaved();
        pop();
      } catch (error) {
        await showFailureToast(error, { title: "Could not save the preset" });
      }
    },
  });

  return (
    <Form
      navigationTitle={props.preset ? `Edit ${props.preset.name}` : "New Preset"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Preset" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Sofa" {...itemProps.name} />
      <Form.TextField title="Distance" placeholder="0 (wall) to 100" {...itemProps.distance} />
      <Form.TextField title="Rotation" placeholder="-100 (left) to 100 (right)" {...itemProps.rotation} />
      <Form.Description text="Rotation can never exceed distance: the TV cannot turn while it is against the wall." />
    </Form>
  );
}
