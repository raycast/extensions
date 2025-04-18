import { closeMainWindow, showHUD } from "@raycast/api";
import { createNewWindow } from "./scripts";

interface Arguments {
  profile?: string;
}

export default async function Command(props: { arguments: Arguments }) {
  try {
    await closeMainWindow();
    await createNewWindow(props.arguments.profile);
  } catch (error) {
    await showFailureToast(error, { title: "Could not open a new Dia window" });
  }
}
