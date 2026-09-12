import { runAppleScript } from "@raycast/utils";

const defaultOptions = {
  soundName: "default",
};

export async function sendNotification(options: {
  title: string;
  message: string;
  subtitle?: string;
  soundName?: string;
}): Promise<void> {
  const { message, title, subtitle, soundName } = { ...defaultOptions, ...options };

  let script = `display notification "${message}" with title "${title}"`;

  if (subtitle) {
    script += ` subtitle "${subtitle}"`;
  }

  if (soundName) {
    script += ` sound name "${soundName}"`;
  }

  try {
    await runAppleScript(script);
    console.log("Notification sent successfully");
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}
