import {
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { sendWizCommand } from "./utils/wiz";
import { useState } from "react";

interface FormValues {
  color: string;
  brightness: string;
}

export default function Command() {
  const { pop } = useNavigation();
  const [brightnessError, setBrightnessError] = useState<string | undefined>();

  function validateBrightness(value: string) {
    const val = parseInt(value);
    if (isNaN(val)) {
      return "Must be a number";
    }
    if (val < 10 || val > 100) {
      return "Value must be between 10 and 100";
    }
    return undefined;
  }

  async function handleSubmit(values: FormValues) {
    const error = validateBrightness(values.brightness);
    if (error) {
      setBrightnessError(error);
      return;
    }

    try {
      // Raycast Color Picker returns hex string or a color object.
      // Usually hex #RRGGBB.
      // We need to parse it to R, G, B
      const hex = values.color.replace("#", "");
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const dimming = parseInt(values.brightness);

      await sendWizCommand("setPilot", { r, g, b, dimming });
      await showToast({ style: Toast.Style.Success, title: "Color Set" });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Color" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="color"
        title="Color"
        defaultValue="#FFFFFF"
        placeholder="#RRGGBB"
      />
      <Form.TextField
        id="brightness"
        title="Brightness (%)"
        placeholder="10 - 100"
        defaultValue="100"
        error={brightnessError}
        onChange={() => setBrightnessError(undefined)}
        onBlur={(event) => {
          const error = validateBrightness(event.target.value ?? "");
          setBrightnessError(error);
        }}
      />
    </Form>
  );
}
