import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import title from "title";

interface Arguments {
  title: string;
}

export default async function Command(props: { arguments: Arguments }) {
  await Clipboard.copy(title(props.arguments.title));
  await showHUD("Copied to clipboard");
  await closeMainWindow({ clearRootSearch: true });
}
