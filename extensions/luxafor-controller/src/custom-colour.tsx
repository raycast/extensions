import { Action, ActionPanel, Form } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { normaliseHex } from "./luxafor-state";
import { useController } from "./use-controller";

export default function CustomColour() {
  const { loading, send } = useController();
  const { handleSubmit, itemProps } = useForm<{ colour: string }>({
    initialValues: { colour: "" },
    validation: { colour: (value) => (normaliseHex(value ?? "") ? undefined : "Use #RGB or #RRGGBB.") },
    async onSubmit(values) {
      const hex = normaliseHex(values.colour);
      if (hex) await send({ kind: "solid", colour: hex });
    },
  });
  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Custom Color" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Send a solid color to Luxafor. API acceptance does not confirm physical device state." />
      <Form.TextField
        {...itemProps.colour}
        title="Hex Color"
        placeholder="#3A7 or #33AA77"
        info="Use three or six hexadecimal digits (0–9 and A–F), with an optional #. Short values expand each digit; #3A7 becomes 33aa77. Use #000 to turn off."
      />
    </Form>
  );
}
