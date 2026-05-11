import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export type Channel = "COM1" | "COM2" | "INTERCOM1" | "INTERCOM2";

interface SendOptions {
  channel: Channel;
  message: string;
  loadingTitle: string;
  successTitle: string;
}

export async function sendToSayIntentions({
  channel,
  message,
  loadingTitle,
  successTitle,
}: SendOptions): Promise<boolean> {
  const { apiKey } = getPreferenceValues<Preferences>();

  if (message.length > 255) {
    await showToast({ style: Toast.Style.Failure, title: "Too long", message: "Maximum 255 characters" });
    return false;
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    channel: channel,
    message: message,
    rephrase: "0",
  });

  const url = `https://apipri.sayintentions.ai/sapi/sayAs?${params.toString()}`;

  try {
    await showToast({ style: Toast.Style.Animated, title: loadingTitle });

    const response = await fetch(url);

    if (response.ok) {
      await showToast({ style: Toast.Style.Success, title: successTitle });
      return true;
    } else {
      const errorText = await response.text();
      await showToast({ style: Toast.Style.Failure, title: "Failed to send", message: errorText });
      return false;
    }
  } catch (error) {
    await showFailureToast(error, { title: "Failed to send message" });
    return false;
  }
}
