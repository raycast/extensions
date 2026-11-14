import {
  Clipboard,
  closeMainWindow,
  showHUD,
  type LaunchProps,
} from "@raycast/api";
import { typeOutText } from "./typing";

export default async function Command(
  props: LaunchProps<{ arguments?: { text?: string } }>,
) {
  const argText = props.arguments?.text?.trim() ?? "";
  const source =
    argText.length > 0 ? argText : ((await Clipboard.readText()) ?? "");

  if (source.trim().length === 0) {
    await closeMainWindow({ clearRootSearch: true });
    await showHUD(
      "Type Out: nothing to type — pass text as an argument or copy something first",
    );
    return;
  }

  await typeOutText(source);
}
