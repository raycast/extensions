import { exec } from "child_process";
import { captureException } from "@raycast/api";
import { buildException } from "./buildException";

const ntfyCurlCommand = (
  reminderTopic: string,
  ntfyTopic: string,
) => `curl -H "Click: https://www.raycast.com/comoser/simple-reminder" \
    -H "Tags: bell" \
    -H "Priority: urgent" \
    -H "Title: Simple Reminder" \
    -d "${reminderTopic}" \
    ntfy.sh/${ntfyTopic}`;

export async function sendPushNotificationWithNtfy(ntfyTopic: string, reminderTopic: string) {
  try {
    exec(ntfyCurlCommand(reminderTopic, ntfyTopic), (err) => {
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
