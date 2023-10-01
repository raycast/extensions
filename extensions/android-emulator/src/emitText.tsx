import { Action, ActionPanel, Form, showToast } from "@raycast/api";
import { useState } from "react";
import { adbPath, executeAsync } from "./util";
import { Emulator } from "./types";
import { Emulators } from "./emulators";

type Values = {
  text: string;
};

export default function Command() {
  const [chosenDevice, setChosenDevice] = useState<Emulator | undefined>(undefined);

  async function submit(text: string) {
    if (!chosenDevice) {
      return;
    }

    const response = await executeAsync(`${adbPath} -s ${chosenDevice.id} emu event text ${text}`);
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
              <Action.SubmitForm onSubmit={(values: Values) => submit(values.text)} />
            </ActionPanel>
          }
        >
          <Form.TextField title="Text" placeholder="Raycast" id="text" />
        </Form>
      )}
      {!chosenDevice && <Emulators onEmulatorChoosen={deviceChosen} />}
    </>
  );
}
