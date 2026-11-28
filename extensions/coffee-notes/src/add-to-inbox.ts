import { LaunchProps, showHUD } from "@raycast/api";
import { runCoffee } from "./coffee";

export default async function AddToInbox(props: LaunchProps<{ arguments: Arguments.AddToInbox }>) {
  const text = props.arguments.text.trim();
  if (!text) return;
  if (await runCoffee("inbox", { text })) await showHUD("Added to Inbox");
}
