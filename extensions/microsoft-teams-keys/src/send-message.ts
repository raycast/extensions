import { LaunchProps, showHUD } from "@raycast/api";
import { chatHud, openChat } from "./lib/chat";
import { report } from "./lib/meeting";

export default async function Command(props: LaunchProps<{ arguments: Arguments.SendMessage }>) {
  try {
    const result = await openChat({ person: props.arguments.person, message: props.arguments.message, send: true });
    await showHUD(chatHud(result));
  } catch (error) {
    await report(error, "Could not send the message");
  }
}
