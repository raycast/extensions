import {
  Clipboard,
  type LaunchProps,
  closeMainWindow,
  open,
  showHUD,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { detectInputType } from "./lib/detect-input";

export default async function Command(
  props: LaunchProps<{ arguments: Arguments.Metasleuth }>,
) {
  const network = props.arguments.network || "eth";

  const clipboard = await Clipboard.readText();
  const input = clipboard?.trim() || "";

  if (!input) {
    await showFailureToast("Copy an account address first", {
      title: "Nothing in clipboard",
    });
    return;
  }

  const inputType = detectInputType(input);
  if (inputType !== "address") {
    await showFailureToast(
      "Must be an account address (0x + 40 hex characters)",
      {
        title: "Invalid clipboard content",
      },
    );
    return;
  }

  const url = `https://metasleuth.io/result/${network}/${input}`;
  await open(url);
  await closeMainWindow();
  await showHUD("Opened in browser");
}
