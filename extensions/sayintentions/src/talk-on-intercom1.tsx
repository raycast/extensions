import { LaunchProps, closeMainWindow } from "@raycast/api";
import { sendToSayIntentions } from "./sayintentions";

export default async function Command(props: LaunchProps<{ arguments: Arguments.TalkOnIntercom1 }>) {
  await closeMainWindow();

  // message is guaranteed non-empty by required: true in package.json
  const { message } = props.arguments;

  await sendToSayIntentions({
    channel: "INTERCOM1",
    message,
    loadingTitle: "Talking on Intercom 1...",
    successTitle: "Sent on Intercom 1",
  });
}
