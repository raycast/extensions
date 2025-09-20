import { Action, ActionPanel, Form, Toast, showToast } from "@raycast/api";
import { Emulator } from "../types/Emulator";
import { adbPath, executeAsync, isNumber } from "../util/utils";

type Values = {
  percentage: string;
};

export default function SetBatteryPercentageForm(props: {
  emulator: Emulator;
}) {
  async function submit(text: string) {
    if (!isNumber(text)) {
      await showToast({
        title: "Percentage should be a number",
        style: Toast.Style.Failure,
      });
      return;
    }
    const percentage = parseInt(text);
    if (percentage < 0 || percentage > 100) {
      await showToast({
        title: "Percentage should be between 0 and 100",
        style: Toast.Style.Failure,
      });
      return;
    }

    const response = await executeAsync(
      `${adbPath} -s ${props.emulator.id} emu power capacity ${percentage}`
    );
    await showToast({ title: response.trim() });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values: Values) => submit(values.percentage)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Percentage (from 0 to 100)"
        placeholder="50"
        id="percentage"
      />
    </Form>
  );
}
