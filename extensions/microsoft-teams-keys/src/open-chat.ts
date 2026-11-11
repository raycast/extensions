import { LaunchProps, getPreferenceValues, showHUD } from "@raycast/api";
import { chatHud, openChat } from "./lib/chat";
import { report } from "./lib/meeting";

export default async function Command(props: LaunchProps<{ arguments: Arguments.OpenChat }>) {
  const { afterTyping } = getPreferenceValues<Preferences.OpenChat>();
  try {
    const result = await openChat({
      person: props.arguments.person,
      message: props.arguments.message,
      send: afterTyping === "send",
    });
    await showHUD(chatHud(result));
  } catch (error) {
    await report(error, "Could not open the chat");
  }
}
