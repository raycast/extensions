import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { WiiMAPI } from "./wiim/api";
import { WiiMAPIError } from "./wiim/errors";
import { resolveDevice } from "./wiim/discovery";

interface Values {
  volume: string;
}

export default function Command() {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [currentVolume, setCurrentVolume] = useState("50");

  useEffect(() => {
    resolveDevice()
      .then((device) => new WiiMAPI(device).getVolume())
      .then((vol) => setCurrentVolume(String(vol)))
      .catch(() => {
        /* keep default */
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSubmit(values: Values) {
    const volume = parseInt(values.volume, 10);
    if (isNaN(volume) || volume < 0 || volume > 100) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid volume",
        message: "Enter a number between 0 and 100",
      });
      return;
    }
    setIsLoading(true);
    try {
      const device = await resolveDevice();
      await new WiiMAPI(device).setVolume(volume);
      await showToast({ style: Toast.Style.Success, title: `Volume set to ${volume}` });
      pop();
    } catch (error) {
      if (error instanceof WiiMAPIError) {
        const hint = error.getHint();
        showFailureToast(hint.title, { message: hint.message });
      } else {
        showFailureToast("Failed to set volume", { message: String(error) });
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Volume" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="volume" title="Volume (0–100)" value={currentVolume} onChange={setCurrentVolume} />
    </Form>
  );
}
