import { Action, ActionPanel, Form, popToRoot } from "@raycast/api";
import { useState } from "react";
import { nightlight } from "./utils";

export default function Main() {
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
                await nightlight(["temp", temperature]);
                await popToRoot({ clearSearchBar: true });
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
