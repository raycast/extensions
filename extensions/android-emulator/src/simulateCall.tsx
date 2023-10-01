import { Action, ActionPanel, Form, Icon, Keyboard, List, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { adbPath, executeAsync } from "./util";
import { Emulator } from "./types";
import { getEmulators } from "./emulatorUtil";

type Values = {
  number: string;
};

export default function Main() {
  const [isLoading, setLoading] = useState<boolean>(true);
  const [devices, setDevices] = useState<Emulator[]>([]);
  const [chosenDevice, setChosenDevice] = useState<Emulator | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const devices = await getEmulators();
        setDevices(devices);
        setLoading(false);
      } catch (error: any) {
        setLoading(false);
        await showToast({ title: `Error:${error}` });
      }
    })();
  }, []);

  async function call(number: string) {
    const response = await executeAsync(`${adbPath} -s ${chosenDevice?.id} emu gsm call ${number}`);
    await showToast({ title: response.trim() });
  }

  async function accept(number: string) {
    const response = await executeAsync(`${adbPath} -s ${chosenDevice?.id} emu gsm accept ${number}`);
    await showToast({ title: response.trim() });
  }

  async function cancel(number: string) {
    const response = await executeAsync(`${adbPath} -s ${chosenDevice?.id} emu gsm cancel ${number}`);
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
      )}
      {!chosenDevice && (
        <List isLoading={isLoading}>
          {devices.map((item) => {
            return (
              <List.Item
                title={item.name}
                subtitle={item.id}
                key={item.id}
                actions={
                  <ActionPanel>
                    <Action.SubmitForm onSubmit={() => deviceChosen(item)} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List>
      )}
    </>
  );
}
