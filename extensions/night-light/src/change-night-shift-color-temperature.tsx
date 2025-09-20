import { Action, ActionPanel, Form, popToRoot, getPreferenceValues, closeMainWindow } from "@raycast/api";
import { useState } from "react";
import { nightlight } from "./utils";

export default function Main() {
  const closeWindow = getPreferenceValues<Preferences>().closeWindow;

  const [temperatureError, setTemperatureError] = useState<string | undefined>();

  function validate(temperature: string): boolean {
    const value = parseInt(temperature);

    if (isNaN(value)) {
      setTemperatureError("Must be an integer.");
      return false;
    } else if (value < 0 || value > 100) {
      setTemperatureError("Must be between 0-100.");
      return false;
    } else {
      setTemperatureError(undefined);
      return true;
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Change Color Temperature"
            onSubmit={async ({ temperature }) => {
              if (validate(temperature)) {
                if (closeWindow) closeMainWindow();
                else await popToRoot({ clearSearchBar: true });

                await nightlight(`temp ${temperature}`, `Set color temperature to ${temperature}`);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="temperature"
        title="Temperature"
        placeholder="integer between 0 and 100"
        error={temperatureError}
        onChange={validate}
      />
    </Form>
  );
}
