import {
  Action,
  ActionPanel,
  Detail,
  LaunchType,
  Toast,
  getPreferenceValues,
  launchCommand,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { cache } from "./support";
import { LoginPayload } from "./interfaces";
import axios, { AxiosResponse } from "axios";
import { LINKINIZE_DOMAIN, TOKEN } from "./constants";
import { useState } from "react";

export function AuthScreen() {
  const [message, setMessage] = useState("Just a sec, Logging you in...");
  axios
    .post(`${LINKINIZE_DOMAIN}/api/auth/login`, getPreferenceValues<LoginPayload>())
    .then(async function (response: AxiosResponse) {
      cache.set(TOKEN, response.data.access_token);
      await showToast({ title: "Linkinize is Ready", message: "Enjoy lightening fast Bookmarks 🚀" });
      await launchCommand({ name: "synchronize", type: LaunchType.UserInitiated });
    })
    .catch(async function (error) {
      setMessage("Whoops! Looks like your credentials do not work! Press **Enter** to review your credentials.");
      await showToast({
        title: "Authentication Failed",
        message: "Please check your credentials.",
        style: Toast.Style.Failure,
      });
      cache.clear();
    });
  const markdown = `
![Image Title](icon.png?raycast-width=64&raycast-height=64)

${message}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
