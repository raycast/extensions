import { Action, ActionPanel, Form, showToast } from "@raycast/api";
import { Emulator } from "../types/Emulator";
import { executeAsync, adbPath } from "../util/utils";

type Values = {
  speed: string;
};

interface NetworkSpeed {
  name: string;
  description: string;
}

export default function SetNetworkSpeedForm(props: { emulator: Emulator }) {
  async function submit(speed: string) {
    const response = await executeAsync(
      `${adbPath} -s ${props.emulator?.id} emu network speed ${speed}`
    );
    await showToast({ title: response.trim() });
  }

  function getSpeeds(): NetworkSpeed[] {
    return [
      {
        name: "gsm",
        description: "GSM/CSD which uses a speed of 14.4 up and 14.4 down.",
      },
      {
        name: "hscsd",
        description: "HSCSD which uses a speed of 14.4 up and 43.2 down.",
      },
      {
        name: "gprs",
        description: "GPRS which uses a speed of 40.0 up and 80.0 down.",
      },
      {
        name: "edge",
        description:
          "EDGE/EGPRS which uses a speed of 118.4 up and 236.8 down.",
      },
      {
        name: "umts",
        description: "UMTS/3G which uses a speed of 128.0 up and 1920 down.",
      },
      {
        name: "hsdpa",
        description: " HSDPA which uses a speed of 348.0 up and 14,400.0 down.",
      },
      {
        name: "lte",
        description: "LTE which uses a speed of 58,000 up and 173,000 down.",
      },
      {
        name: "evdo",
        description: "EVDO which uses a speed of 75,000 up and 280,000 down.",
      },
      {
        name: "full",
        description:
          "Unlimited speed but depends on the connection speed of your computer.",
      },
    ];
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values: Values) => submit(values.speed)}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="speed" title="Speed" defaultValue="full">
        {getSpeeds().map((item) => {
          return (
            <Form.Dropdown.Item
              title={`${item.description}`}
              key={item.name}
              value={item.name}
            />
          );
        })}
      </Form.Dropdown>
    </Form>
  );
}
