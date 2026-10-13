import { LaunchProps, closeMainWindow, showHUD } from "@raycast/api";
import { messageOf, speak } from "./lib/host.js";
import { logFailure } from "./lib/state.js";

export default async function TypeToSpeak({
  arguments: args,
}: LaunchProps<{ arguments: Arguments.TypeToSpeak }>) {
  const content = args.content?.trim();
  if (!content) return;
  await closeMainWindow();
  try {
    await speak(content);
  } catch (error) {
    logFailure("type-to-speak", error);
    await showHUD(`Could not speak: ${messageOf(error)}`);
  }
}
