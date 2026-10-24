import { LaunchProps, closeMainWindow } from "@raycast/api";
import { bolt, showBoltFailure } from "./bolt";

export default async function Command(props: LaunchProps<{ arguments: Arguments.NewChat }>) {
  const message = props.arguments.message?.trim() ?? "";
  try {
    // Without a message BoltAI opens a new empty chat; with one it opens the chat and sends it.
    await bolt(message ? ["chat", "new", "--", message] : ["chat", "new"]);
    await closeMainWindow();
  } catch (error) {
    await showBoltFailure(error);
  }
}
