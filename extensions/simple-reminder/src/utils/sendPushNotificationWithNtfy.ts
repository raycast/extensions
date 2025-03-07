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
  url?: URL,
) => `curl -H "Click: ${url?.toString() ?? "https://www.raycast.com/comoser/simple-reminder"}" \
    -H "Tags: bell" \
    -H "Priority: urgent" \
    -H "Title: Simple Reminder" \
    ${selfHostedOptions.serverAccessToken ? `-H "Authorization: Bearer ${selfHostedOptions.serverAccessToken}"` : ""} \
    -d "${reminderTopic}" \
    ${selfHostedOptions.serverUrl ?? "ntfy.sh"}/${ntfyTopic}`;

export function sendPushNotificationWithNtfy(
  ntfyTopic: string,
  reminderTopic: string,
  selfHostedOptions: {
    serverUrl?: string;
    serverAccessToken?: string;
  },
  url?: URL,
) {
  try {
    exec(ntfyCurlCommand(reminderTopic, ntfyTopic, selfHostedOptions, url), (err) => {
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
