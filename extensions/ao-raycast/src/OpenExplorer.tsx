import { open, getSelectedText, getPreferenceValues } from "@raycast/api";

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
      throw new Error(
        "No transaction ID provided. Please provide a 43-character Arweave transaction ID.",
      );
    }
  }

  if (!txId || txId.length !== 43) {
    throw new Error("Transaction ID must be 43 characters long");
  }

  const { explorer } = getPreferenceValues<Preferences>();
  await open(getExplorerUrl(txId, explorer));
}
