import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";

export const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http("https://ethereum-rpc.publicnode.com"),
});

export const normalizeEnsName = (name: string) => normalize(name.trim());

export const ENS_RECORDS = {
  BTC: "BTC",
  description: "description",
  discord: "com.discord",
  DOGE: "DOGE",
  email: "email",
  ETH: "ETH",
  github: "com.github",
  instagram: "com.instagram",
  LTC: "LTC",
  pronouns: "pronouns",
  reddit: "com.reddit",
  snapchat: "com.snapchat",
  telegram: "org.telegram",
  twitter: "com.twitter",
  url: "url",
  website: "website",
  cover: "cover",
  keywords: "keywords",
} as const;

export async function fetchEnsRecords(name: string): Promise<Record<string, string>> {
  const keys = Object.values(ENS_RECORDS);
  const values = await Promise.all(keys.map((key) => mainnetClient.getEnsText({ name, key }).catch(() => null)));

  return Object.fromEntries(keys.flatMap((key, index) => (values[index] ? [[key, values[index]]] : []))) as Record<
    string,
    string
  >;
}
