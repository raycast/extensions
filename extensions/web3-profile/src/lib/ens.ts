import { getCoderByCoinType } from "@ensdomains/address-encoder";
import { hexToBytes } from "@ensdomains/address-encoder/utils";
import { createPublicClient, http, toCoinType } from "viem";
import { arbitrum, base, mainnet, optimism } from "viem/chains";
import { normalize } from "viem/ens";

export const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http("https://ethereum-rpc.publicnode.com"),
});

export const normalizeEnsName = (name: string) => normalize(name.trim());

export const ENS_TEXT_RECORD_KEYS = ["description", "url", "org.telegram", "com.telegram", "com.twitter"] as const;

export const ENS_ADDRESS_RECORDS = {
  ethereum: { label: "Ethereum", coinType: 60n },
  bitcoin: { label: "Bitcoin", coinType: 0n },
  solana: { label: "Solana", coinType: 501n },
  base: { label: "Base", coinType: toCoinType(base.id) },
  optimism: { label: "Optimism", coinType: toCoinType(optimism.id) },
  arbitrum: { label: "Arbitrum", coinType: toCoinType(arbitrum.id) },
} as const;

type EnsTextRecordKey = typeof ENS_TEXT_RECORD_KEYS[number];
export type EnsAddressRecordKey = keyof typeof ENS_ADDRESS_RECORDS;

export interface EnsRecords {
  texts: Partial<Record<EnsTextRecordKey, string>>;
  addresses: Partial<Record<EnsAddressRecordKey, string>>;
}

export async function fetchEnsRecords(name: string): Promise<EnsRecords> {
  const addressRecords = Object.entries(ENS_ADDRESS_RECORDS) as [
    EnsAddressRecordKey,
    typeof ENS_ADDRESS_RECORDS[EnsAddressRecordKey]
  ][];

  const [textValues, addressValues] = await Promise.all([
    Promise.all(ENS_TEXT_RECORD_KEYS.map((key) => mainnetClient.getEnsText({ name, key }).catch(() => null))),
    Promise.all(
      addressRecords.map(async ([, { coinType }]) => {
        const address = await mainnetClient.getEnsAddress({ name, coinType }).catch(() => null);
        if (!address) return null;

        try {
          return getCoderByCoinType(Number(coinType)).encode(hexToBytes(address));
        } catch {
          return null;
        }
      })
    ),
  ]);

  return {
    texts: Object.fromEntries(
      ENS_TEXT_RECORD_KEYS.flatMap((key, index) => (textValues[index] ? [[key, textValues[index]]] : []))
    ),
    addresses: Object.fromEntries(
      addressRecords.flatMap(([key], index) => (addressValues[index] ? [[key, addressValues[index]]] : []))
    ),
  };
}
