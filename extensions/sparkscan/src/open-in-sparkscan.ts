import { Clipboard, open, showHUD } from "@raycast/api";

import { SparkAddressMatch, TokenMatch, TransactionMatch, type Matchers } from "./lib/matchers";
import { addRaycastUTM } from "./lib/url";

const matchSearch = (search: string, network: "MAINNET" | "REGTEST"): Matchers => {
  const matchers = [
    new SparkAddressMatch(search, network),
    new TransactionMatch(search, network),
    new TokenMatch(search, network),
  ];

  return matchers.filter((matcher) => matcher.match());
};

export default async function main() {
  const { text: clipboard } = await Clipboard.read();
  const addressType = matchSearch(clipboard, "MAINNET");

  if (addressType.length === 0) {
    await showHUD("Invalid input");
    return;
  }

  const path = addressType[0].path;
  await open(addRaycastUTM(path, "open-in-sparkscan"));
}
