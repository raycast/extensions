import { LaunchProps, closeMainWindow } from "@raycast/api";
import { sendToSayIntentions } from "./sayintentions";

interface Arguments {
  message: string;
}

export default async function Command(props: LaunchProps<{ arguments: Arguments }>) {
  await closeMainWindow();

  // message is guaranteed non-empty by required: true in package.json
  const { message } = props.arguments;

  await sendToSayIntentions({
    channel: "COM2",
    message,
    loadingTitle: "Talking to ATC (COM2)...",
    successTitle: "Sent to ATC (COM2)",
  });
}
