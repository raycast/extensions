import { closeMainWindow, showHUD } from "@raycast/api";
import { createNewWindow } from "./scripts";

interface Arguments {
  profile?: string;
}

export default async function Command(props: { arguments: Arguments }) {
  try {
    await closeMainWindow();
    await createNewWindow(props.arguments.profile);
  } catch {
    await showHUD("❌ Failed opening a new Dia window");
  }
}
