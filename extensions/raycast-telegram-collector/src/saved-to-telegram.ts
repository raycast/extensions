import { showHUD, getPreferenceValues, LaunchProps, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";

interface Preferences {
  bot_token: string;
  chat_id: string;
}

interface Arguments {
  inputText: string;
}

export default async function main(props: LaunchProps<{ arguments: Arguments }>) {
  const { inputText } = props.arguments;
  const preferences = getPreferenceValues<Preferences>();
  const { bot_token, chat_id } = preferences;

  const apiUrl = `https://api.telegram.org/bot${bot_token}/sendMessage`;
  const payload = {
    chat_id: chat_id,
    text: inputText,
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      await showHUD("Saved!");
    } else {
      const errorData = await response.json();
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to send message",
        message: `Error: ${response.status} - ${errorData || "Unknown error"}`,
      });
    }
  } catch (error) {
    console.error("Error sending message:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to send message",
      message: error instanceof Error ? error.message : "An unexpected error occurred",
    });
  }
}
