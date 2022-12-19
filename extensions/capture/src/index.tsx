import {
  Action,
  ActionPanel,
  closeMainWindow,
  confirmAlert,
  environment,
  Form,
  getPreferenceValues,
  Icon,
  openCommandPreferences,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import fetch, { RequestInit } from "node-fetch";
import { useState } from "react";

import { Env, useEnv } from "./useEnv";

interface Preferences {
  jwt: string;
}

interface FormValues {
  text: string;
}

export default function Command() {
  // Env used for API requests (selectable in development environments)
  const { env, envOrder, getApiConfig, setEnv } = useEnv();

  // Raycast Preferences for this command
  const preferences = getPreferenceValues<Preferences>();

  // Error message for the primary TextArea
  const [textErrorMessage, setTextErrorMessage] = useState<string | undefined>();

  // Clear the text error message
  const clearTextErrorMessage = () => setTextErrorMessage(undefined);

  // Handle changes to Env and prompt user open Raycast Preferences to update their JWT
  const handleChangeEnv = async (nextEnv: Env) => {
    if (nextEnv === env) return;

    if (
      await confirmAlert({
        title: `Change environment to ${nextEnv}?`,
        message: `Select "Confirm" to open Raycast Preferences and update your JWT.`,
      })
    ) {
      setEnv(nextEnv);
      openCommandPreferences();
    }
  };

  // Handle Form submit and send request to the API
  const handleSubmit = async (formValues: FormValues) => {
    if (!formValues.text) return setTextErrorMessage("Required");

    const { url } = await getApiConfig();

    showToast({ title: "Sending to Capture...", style: Toast.Style.Animated });

    fetch(url, POST({ body: { text: formValues.text }, token: preferences.jwt }))
      .then(() => {
        // Close main window after request succeeds
        closeMainWindow();
        // Ensure the user sees root search when they re-open Raycast
        popToRoot();
      })
      .catch(() =>
        showToast({ title: "Something went wrong", message: "Please try again", style: Toast.Style.Failure })
      );
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
          {environment.isDevelopment && (
            <ActionPanel.Submenu title="Change Environment...">
              {envOrder.map((_env) => (
                <Action
                  key={_env}
                  title={_env}
                  icon={_env === env ? Icon.CircleProgress100 : Icon.Circle}
                  onAction={() => handleChangeEnv(_env)}
                />
              ))}
            </ActionPanel.Submenu>
          )}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        placeholder="Start typing..."
        error={textErrorMessage}
        onChange={clearTextErrorMessage}
      />
    </Form>
  );
}

interface POSTParams {
  body: { text: string };
  token: string;
}

const POST: (params: POSTParams) => RequestInit = ({ body, token }) => ({
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "X-Capture-Raycast-Ext": "true",
  },
  body: JSON.stringify(body),
});
