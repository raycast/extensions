import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { adbPath, executeAsync, isNumber } from "./util";
import { Emulator } from "./types";
import { Emulators } from "./emulators";

type Values = {
  percentage: string;
};

export default function Command() {
  const [chosenDevice, setChosenDevice] = useState<Emulator | undefined>(undefined);

  async function submit(text: string) {
    if (!chosenDevice) {
      return;
    }

    if (!isNumber(text)) {
      await showToast({ title: "Percentage should be a number", style: Toast.Style.Failure });
      return;
    }
    const percentage = parseInt(text);
    if (percentage < 0 || percentage > 100) {
      await showToast({ title: "Percentage should be between 0 and 100", style: Toast.Style.Failure });
      return;
    }

    const response = await executeAsync(`${adbPath} -s ${chosenDevice.id} emu power capacity ${percentage}`);
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
              <Action.SubmitForm onSubmit={(values: Values) => submit(values.percentage)} />
            </ActionPanel>
          }
        >
          <Form.TextField title="Percentage (from 0 to 100)" placeholder="50" id="percentage" />
        </Form>
      )}
      {!chosenDevice && <Emulators onEmulatorChoosen={deviceChosen} />}
    </>
  );
}
