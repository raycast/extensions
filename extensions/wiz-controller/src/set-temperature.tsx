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
  temp: string;
  brightness: string;
}

export default function Command() {
  const { pop } = useNavigation();
  const [tempError, setTempError] = useState<string | undefined>();
  const [brightnessError, setBrightnessError] = useState<string | undefined>();

  function validateTemp(value: string) {
    const temp = parseInt(value);
    if (isNaN(temp)) return "Must be a number";
    if (temp < 2200 || temp > 6200)
      return "Value must be between 2200 and 6200";
    return undefined;
  }

  function validateBrightness(value: string) {
    const val = parseInt(value);
    if (isNaN(val)) return "Must be a number";
    if (val < 10 || val > 100) return "Value must be between 10 and 100";
    return undefined;
  }

  async function handleSubmit(values: FormValues) {
    const tError = validateTemp(values.temp);
    const bError = validateBrightness(values.brightness);

    if (tError || bError) {
      if (tError) setTempError(tError);
      if (bError) setBrightnessError(bError);
      return;
    }

    try {
      const temp = parseInt(values.temp);
      const dimming = parseInt(values.brightness);

      await sendWizCommand("setPilot", { temp, dimming });
      await showToast({ style: Toast.Style.Success, title: "Temperature Set" });
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
          <Action.SubmitForm title="Set Temperature" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="temp"
        title="Temperature (K)"
        placeholder="2200 - 6200"
        defaultValue="2700"
        error={tempError}
        onChange={() => setTempError(undefined)}
        onBlur={(event) => setTempError(validateTemp(event.target.value ?? ""))}
      />

      <Form.TextField
        id="brightness"
        title="Brightness (%)"
        placeholder="10 - 100"
        defaultValue="100"
        error={brightnessError}
        onChange={() => setBrightnessError(undefined)}
        onBlur={(event) =>
          setBrightnessError(validateBrightness(event.target.value ?? ""))
        }
      />
    </Form>
  );
}
