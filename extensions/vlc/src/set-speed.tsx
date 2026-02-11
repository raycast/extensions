import { showHUD, LaunchProps, Form, ActionPanel, Action } from "@raycast/api";
import { makeVLCRequest, handleVLCError } from "./utils";

interface SetSpeedArguments {
  speed: string;
}

export default async function Command(props: LaunchProps<{ arguments: SetSpeedArguments }>) {
  const { speed } = props.arguments;

  if (!speed) {
    return (
      <Form
        navigationTitle="Set Playback Speed"
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Set Speed"
              onSubmit={async (values: { speed: string }) => {
                await setSpeed(values.speed);
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="speed"
          title="Playback Speed"
          placeholder="1.0 (0.25-4.0)"
          info="1.0 = normal, 0.5 = half speed, 2.0 = double speed"
        />
      </Form>
    );
  }

  await setSpeed(speed);
}

async function setSpeed(speedInput: string) {
  try {
    const speed = parseFloat(speedInput);

    if (isNaN(speed) || speed < 0.25 || speed > 4.0) {
      await showHUD("⚠️ Speed must be between 0.25 and 4.0");
      return;
    }

    await makeVLCRequest({ command: "rate", parameters: { val: speed } });
    await showHUD(`⚡ Speed set to ${speed}x`);
  } catch (error) {
    await handleVLCError(error, "set playback speed");
  }
}
