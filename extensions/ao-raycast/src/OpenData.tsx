import "cross-fetch/polyfill";
import {
  open,
  getPreferenceValues,
  LocalStorage,
  getSelectedText,
} from "@raycast/api";
import { getRoutableUrl } from "./utils/ao";

interface Preferences {
  defaultGateway: string;
  useWayfinder: boolean;
}

interface CommandArguments {
  txId?: string;
}

export default async function Command(props: { arguments: CommandArguments }) {
  let txId = props.arguments.txId;

  if (!txId) {
    try {
      txId = await getSelectedText();
    } catch {
      // Handle error silently
    }
  }

  if (!txId) {
    throw new Error(
      "No transaction ID provided. Please provide a 43-character Arweave transaction ID.",
    );
  }

  const { defaultGateway, useWayfinder } = getPreferenceValues<Preferences>();
  let dataUrl: string;

  try {
    let storedGateway = defaultGateway;
    if (useWayfinder) {
      try {
        const bestGateway = await LocalStorage.getItem<string>("best_gateway");
        if (bestGateway) {
          storedGateway = bestGateway;
        }
      } catch {
        // Use default gateway if there's an error
      }
    }

    try {
      const url = await getRoutableUrl(txId, storedGateway);
      dataUrl = url || `https://${storedGateway}/${txId}`;
    } catch {
      dataUrl = `https://arweave.net/${txId}`;
    }

    await open(dataUrl);
  } catch (error) {
    throw error;
  }
}
