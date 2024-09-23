import webpush, { PushSubscription } from "web-push";
import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { Preferences } from "./setup";

export default async function main() {
  const preferences = getPreferenceValues<Preferences>();
  const email = preferences.email;
  const privateKey = preferences.privateKey;
  const publicKey = preferences.publicKey;
  const title = preferences.title;
  const body = preferences.body;

  webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);

  await sendNotification(body, title);
}

async function sendNotification(message: string, title: string) {
  const preferences = getPreferenceValues<Preferences>();

  const endpoint = preferences.endpoint;
  const p256dh = preferences.p256dh;
  const auth = preferences.auth;
  const subscription: PushSubscription = {
    endpoint,
    keys: {
      p256dh,
      auth,
    },
  };

  if (!subscription) {
    await showHUD("No subscription available");
    throw new Error("No subscription available");
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Sending notification",
  });

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: title,
        body: message,
        icon: "/icon.png",
      }),
    );

    toast.style = Toast.Style.Success;
    toast.title = "Sent notification";
    toast.message = "Notification sent successfully";

    await showHUD("Notification sent");

    return { success: true };
  } catch (error) {
    toast.style = Toast.Style.Success;
    toast.title = "Failed";
    toast.message = "Failed to send notification";

    return { success: false, error: "Failed to send notification" };
  }
}
