import {
  Clipboard,
  type LaunchProps,
  closeMainWindow,
  open,
  showHUD,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { buildExplorerUrl } from "./lib/build-explorer-url";
import { detectInputType } from "./lib/detect-input";
import { getNetwork } from "./lib/get-network";

export default async function Command(
  props: LaunchProps<{ arguments: Arguments.Explorer }>,
) {
  const { network: networkArg } = props.arguments;

  const clipboard = await Clipboard.readText();
  const input = clipboard?.trim() || "";

  if (!input) {
    await showFailureToast("Copy an address, tx hash, or block number first", {
      title: "Nothing in clipboard",
    });
    return;
  }

  const inputType = detectInputType(input);
  if (!inputType) {
    await showFailureToast(
      "Must be an address (42 chars), tx hash (66 chars), or a block number",
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

  const url = buildExplorerUrl(network, inputType, input);
  await open(url);
  await closeMainWindow();
  await showHUD("Opened in browser");
}
