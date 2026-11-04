import { LaunchProps, closeMainWindow, open } from "@raycast/api";
import { askUrl } from "./lib/config";

// Twelfth's chat runs on a browser session, which no external token can open,
// so the question goes to the app with the composer filled in, ready to send.
export default async function Ask(props: LaunchProps<{ arguments: Arguments.Ask }>) {
  const question = props.arguments.question || props.fallbackText;
  await closeMainWindow();
  await open(askUrl(question));
}
