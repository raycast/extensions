import { Action, ActionPanel, Form, showToast } from "@raycast/api";
import { Emulator } from "../types/Emulator";
import { adbPath, executeAsync } from "../util/utils";

type Values = {
  text: string;
};

export default function EmitTextForm(props: { emulator: Emulator }) {
  async function submit(text: string) {
    const response = await executeAsync(
      `${adbPath} -s ${props.emulator.id} emu event text ${text}`
    );
    await showToast({ title: response.trim() });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values: Values) => submit(values.text)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Text" placeholder="Raycast" id="text" />
    </Form>
  );
}
