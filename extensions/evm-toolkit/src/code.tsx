import {
  Clipboard,
  type LaunchProps,
  closeMainWindow,
  open,
  showHUD,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { buildDethUrl } from "./lib/build-deth-url";
import { detectInputType } from "./lib/detect-input";
import { getNetwork } from "./lib/get-network";

export default async function Command(
  props: LaunchProps<{ arguments: Arguments.Code }>,
) {
  const { network: networkArg } = props.arguments;

  const clipboard = await Clipboard.readText();
  const input = clipboard?.trim() || "";

  if (!input) {
    await showFailureToast("Copy a contract address first", {
      title: "Nothing in clipboard",
    });
    return;
  }

  const inputType = detectInputType(input);
  if (inputType !== "address") {
    await showFailureToast(
      "Must be a contract address (0x + 40 hex characters)",
      {
        title: "Invalid clipboard content",
      },
    );
    return;
  }

  const network = getNetwork(networkArg);
  if (!network) {
    await showFailureToast("Unknown network");
    return;
  }

  const url = buildDethUrl(network, input);
  await open(url);
  await closeMainWindow();
  await showHUD("Opened in browser");
}
