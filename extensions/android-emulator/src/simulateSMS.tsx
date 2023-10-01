import { Action, ActionPanel, Form, showToast } from "@raycast/api";
import { useState } from "react";
import { adbPath, executeAsync } from "./util";
import { Emulator } from "./types";
import { Emulators } from "./emulators";

type Values = {
  number: string;
  message: string;
};

export default function Command() {
  const [chosenDevice, setChosenDevice] = useState<Emulator | undefined>(undefined);

  async function submit(values: Values) {
    const response = await executeAsync(
      `${adbPath} -s ${chosenDevice?.id} emu sms send ${values.number} ${values.message} `
    );
    await showToast({ title: response.trim() });
  }

  async function deviceChosen(emulator: Emulator) {
    setChosenDevice(emulator);
  }

  return (
    <>
      {chosenDevice && (
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
      )}
      {!chosenDevice && <Emulators onEmulatorChoosen={deviceChosen} />}
    </>
  );
}
