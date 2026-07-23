import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { parseColor } from "../lib/color";

interface EditColorsProps {
  foreground: string;
  background: string;
  onSubmit: (foreground: string, background: string) => void;
}

export function EditColors({
  foreground,
  background,
  onSubmit,
}: EditColorsProps) {
  const { pop } = useNavigation();
  const [fg, setFg] = useState(foreground);
  const [bg, setBg] = useState(background);

  const fgValid = parseColor(fg) !== null;
  const bgValid = parseColor(bg) !== null;

  return (
    <Form
      navigationTitle="Edit Colors"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Apply Colors"
            icon={Icon.Check}
            onSubmit={() => {
              if (fgValid && bgValid) {
                onSubmit(fg, bg);
                pop();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="foreground"
        title="Foreground"
        placeholder="HEX, rgb(), hsl(), hsb(), cmyk(), or a color name"
        value={fg}
        error={fg && !fgValid ? "Not a valid color" : undefined}
        onChange={setFg}
      />
      <Form.TextField
        id="background"
        title="Background"
        placeholder="HEX, rgb(), hsl(), hsb(), cmyk(), or a color name"
        value={bg}
        error={bg && !bgValid ? "Not a valid color" : undefined}
        onChange={setBg}
      />
    </Form>
  );
}
