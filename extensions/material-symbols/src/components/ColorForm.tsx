import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";

const HEX_RE = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Form to enter a custom color (HEX). On a valid color, calls onSubmit with a #-prefixed value. */
export function ColorForm(props: {
  initial: string;
  onSubmit: (color: string) => void;
}) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string | undefined>();

  return (
    <Form
      navigationTitle="Enter Custom Color"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Apply Color"
            onSubmit={(values: { hex: string }) => {
              const raw = (values.hex || "").trim();
              if (raw.toLowerCase() === "currentcolor") {
                props.onSubmit("currentColor");
                pop();
                return;
              }
              if (!HEX_RE.test(raw)) {
                setError("Use #RGB or #RRGGBB format");
                return;
              }
              props.onSubmit(raw.startsWith("#") ? raw : `#${raw}`);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="hex"
        title="Color (HEX)"
        placeholder="#0081E8 / 0081E8 / currentColor"
        defaultValue={props.initial}
        error={error}
        onChange={() => error && setError(undefined)}
      />
      <Form.Description text="e.g. #0081E8, #000000, currentColor (follows theme / text color)" />
    </Form>
  );
}
