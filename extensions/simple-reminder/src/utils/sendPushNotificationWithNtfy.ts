import { exec } from "child_process";
import { captureException } from "@raycast/api";
import { buildException } from "./buildException";

const ntfyCurlCommand = (
  reminderTopic: string,
  ntfyTopic: string,
  selfHostedOptions: {
    serverUrl?: string;
    serverAccessToken?: string;
  },
) => `curl -H "Click: https://www.raycast.com/comoser/simple-reminder" \
    -H "Tags: bell" \
    -H "Priority: urgent" \
    -H "Title: Simple Reminder" \
    ${selfHostedOptions.serverAccessToken ? `-H "Authorization: Bearer ${selfHostedOptions.serverAccessToken}"` : ""} \
    -d "${reminderTopic}" \
    ${selfHostedOptions.serverUrl ?? "ntfy.sh"}/${ntfyTopic}`;

export async function sendPushNotificationWithNtfy(
  ntfyTopic: string,
  reminderTopic: string,
  selfHostedOptions: {
    serverUrl?: string;
    serverAccessToken?: string;
  },
) {
  try {
    exec(ntfyCurlCommand(reminderTopic, ntfyTopic, selfHostedOptions), (err) => {
      if (err) {
        console.error("NTFY connection failed", err);
        return;
      }
    });
  } catch (error) {
    captureException(
      buildException(error as Error, "Error sending push notification with NTFY", {
        reminderTopic,
        ntfyTopic,
      }),
    );
  }
}
