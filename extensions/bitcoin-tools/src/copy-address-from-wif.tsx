import { Clipboard, type LaunchProps, showHUD } from "@raycast/api";
import { addressFromWif } from "./lib/bitcoin";

interface CommandArguments {
  wif: string;
}

export default async function Command(
  props: LaunchProps<{ arguments: CommandArguments }>,
) {
  try {
    const { address } = addressFromWif(props.arguments.wif);
    await Clipboard.copy(address);
    await showHUD(`Copied ${address}`, { clearRootSearch: true });
  } catch {
    await showHUD("Invalid WIF private key", { clearRootSearch: true });
  }
}
