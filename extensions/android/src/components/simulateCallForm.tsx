import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Keyboard,
  showToast,
} from "@raycast/api";
import { Emulator } from "../types/Emulator";
import { executeAsync, adbPath } from "../util/utils";

type Values = {
  number: string;
};

export default function SimulateCallForm(props: { emulator: Emulator }) {
  async function call(number: string) {
    const response = await executeAsync(
      `${adbPath} -s ${props.emulator.id} emu gsm call ${number}`
    );
    await showToast({ title: response.trim() });
  }

  async function accept(number: string) {
    const response = await executeAsync(
      `${adbPath} -s ${props.emulator.id} emu gsm accept ${number}`
    );
    await showToast({ title: response.trim() });
  }

  async function cancel(number: string) {
    const response = await executeAsync(
      `${adbPath} -s ${props.emulator.id} emu gsm cancel ${number}`
    );
    await showToast({ title: response.trim() });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Call"
            icon={Icon.PhoneRinging}
            onSubmit={(values: Values) => call(values.number)}
          />
          <Action.SubmitForm
            title="Accept"
            icon={Icon.Phone}
            onSubmit={(values: Values) => accept(values.number)}
          />
          <Action.SubmitForm
            shortcut={Keyboard.Shortcut.Common.Remove}
            title="Cancel"
            icon={Icon.MinusCircleFilled}
            onSubmit={(values: Values) => cancel(values.number)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Number" placeholder="+16xxxxxxxxx" id="number" />
    </Form>
  );
}
