import { Action, ActionPanel, Form, showToast } from "@raycast/api";
import { useState } from "react";
import { adbPath, executeAsync } from "./util";
import { Emulator } from "./types";
import { Emulators } from "./emulators";

type Values = {
  speed: string;
};

export default function Command() {
  const [chosenDevice, setChosenDevice] = useState<Emulator | undefined>(undefined);

  async function submit(speed: string) {
    const response = await executeAsync(`${adbPath} -s ${chosenDevice?.id} emu network speed ${speed}`);
    await showToast({ title: response.trim() });
  }

  async function deviceChosen(emulator: Emulator) {
    setChosenDevice(emulator);
  }

  function getSpeeds(): NetworkSpeed[] {
    return [
      { name: "gsm", description: "GSM/CSD which uses a speed of 14.4 up and 14.4 down." },
      { name: "hscsd", description: "HSCSD which uses a speed of 14.4 up and 43.2 down." },
      { name: "gprs", description: "GPRS which uses a speed of 40.0 up and 80.0 down." },
      { name: "edge", description: "EDGE/EGPRS which uses a speed of 118.4 up and 236.8 down." },
      { name: "umts", description: "UMTS/3G which uses a speed of 128.0 up and 1920 down." },
      { name: "hsdpa", description: " HSDPA which uses a speed of 348.0 up and 14,400.0 down." },
      { name: "lte", description: "LTE which uses a speed of 58,000 up and 173,000 down." },
      { name: "evdo", description: "EVDO which uses a speed of 75,000 up and 280,000 down." },
      { name: "full", description: "Unlimited speed but depends on the connection speed of your computer." },
    ];
  }

  interface NetworkSpeed {
    name: string;
    description: string;
  }

  return (
    <>
      {chosenDevice && (
        <Form
          actions={
            <ActionPanel>
              <Action.SubmitForm onSubmit={(values: Values) => submit(values.speed)} />
            </ActionPanel>
          }
        >
          <Form.Dropdown id="speed" title="Speed" defaultValue="full">
            {getSpeeds().map((item) => {
              return <Form.Dropdown.Item title={`${item.description}`} key={item.name} value={item.name} />;
            })}
          </Form.Dropdown>
        </Form>
      )}
      {!chosenDevice && <Emulators onEmulatorChoosen={deviceChosen} />}
    </>
  );
}
