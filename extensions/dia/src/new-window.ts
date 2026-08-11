import { closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { createNewWindow } from "./dia";

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
