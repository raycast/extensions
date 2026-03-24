import { LaunchProps, closeMainWindow } from "@raycast/api";
import { sendToSayIntentions } from "./sayintentions";

export default async function Command(props: LaunchProps<{ arguments: Arguments.TalkToAtcCom1 }>) {
  await closeMainWindow();

  // message is guaranteed non-empty by required: true in package.json
  const { message } = props.arguments;

  await sendToSayIntentions({
    channel: "COM1",
    message,
    loadingTitle: "Talking to ATC (COM1)...",
    successTitle: "Sent to ATC (COM1)",
  });
}
