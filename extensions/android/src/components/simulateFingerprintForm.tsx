import { Action, ActionPanel, Form, showToast } from "@raycast/api";
import { Emulator } from "../types/Emulator";
import { executeAsync, adbPath } from "../util/utils";

type Values = {
  fingerId: string;
};

export default function SimulateFingerprintForm(props: { emulator: Emulator }) {
  async function touchFingerprint(fingerId: string) {
    const response = await executeAsync(
      `${adbPath} -s ${props.emulator.id} emu finger touch ${fingerId}`
    );
    await showToast({ title: response.trim() });
  }

  async function removeFingerprint(fingerId: string) {
    const response = await executeAsync(
      `${adbPath} -s ${props.emulator.id} emu finger remove ${fingerId}`
    );
    await showToast({ title: response.trim() });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Touch"
            onSubmit={(values: Values) => touchFingerprint(values.fingerId)}
          />
          <Action.SubmitForm
            title="Remove"
            onSubmit={(values: Values) => removeFingerprint(values.fingerId)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Finger ID" placeholder="1" id="fingerId" />
    </Form>
  );
}
