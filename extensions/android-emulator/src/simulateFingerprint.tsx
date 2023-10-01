import { Action, ActionPanel, Form, showToast } from "@raycast/api";
import { useState } from "react";
import { adbPath, executeAsync } from "./util";
import { Emulator } from "./types";
import { Emulators } from "./emulators";

type Values = {
  fingerId: string;
};

export default function Command() {
  const [chosenDevice, setChosenDevice] = useState<Emulator | undefined>(undefined);

  async function touchFingerprint(fingerId: string) {
    const response = await executeAsync(`${adbPath} -s ${chosenDevice?.id} emu finger touch ${fingerId}`);
    await showToast({ title: response.trim() });
  }

  async function removeFingerprint(fingerId: string) {
    const response = await executeAsync(`${adbPath} -s ${chosenDevice?.id} emu finger remove ${fingerId}`);
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
              <Action.SubmitForm title="Touch" onSubmit={(values: Values) => touchFingerprint(values.fingerId)} />
              <Action.SubmitForm title="Remove" onSubmit={(values: Values) => removeFingerprint(values.fingerId)} />
            </ActionPanel>
          }
        >
          <Form.TextField title="Finger ID" placeholder="1" id="fingerId" />
        </Form>
      )}
      {!chosenDevice && <Emulators onEmulatorChoosen={deviceChosen} />}
    </>
  );
}
