import { Action, ActionPanel, Form, showToast } from "@raycast/api";
import { Emulator } from "../types/Emulator";
import { executeAsync, adbPath } from "../util/utils";

type Values = {
  number: string;
  message: string;
};

export default function SimulateSMSForm(props: { emulator: Emulator }) {
  async function submit(values: Values) {
    const response = await executeAsync(
      `${adbPath} -s ${props.emulator.id} emu sms send ${values.number} ${values.message} `
    );
    await showToast({ title: response.trim() });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={(values: Values) => submit(values)} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Number" placeholder="+16xxxxxxxxx" id="number" />
      <Form.TextField title="Message" placeholder="Raycast" id="message" />
    </Form>
  );
}
