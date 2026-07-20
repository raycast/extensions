import { LaunchProps, closeMainWindow } from "@raycast/api";
import { sendToSayIntentions } from "./sayintentions";

export default async function Command(props: LaunchProps<{ arguments: Arguments.TalkToAtcCom2 }>) {
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
