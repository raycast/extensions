import {
  open,
  getSelectedText,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";

interface CommandArguments {
  txId?: string;
}

interface Preferences {
  explorer: string;
}

function getExplorerUrl(txId: string, explorer: string): string {
  return explorer.replace("{txId}", txId);
}

export default async function Command(props: { arguments: CommandArguments }) {
  let txId = props.arguments.txId;

  if (!txId) {
    try {
      txId = await getSelectedText();
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing Transaction ID",
        message: "Please input a 43-character Arweave transaction ID.",
      });
      return;
    }
  }

  if (!txId || txId.length !== 43) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid Transaction ID",
      message: "Transaction ID must be 43 characters long.",
    });
    return;
  }

  const { explorer } = getPreferenceValues<Preferences>();
  const explorerUrl = getExplorerUrl(txId, explorer);
  await open(explorerUrl);
}
