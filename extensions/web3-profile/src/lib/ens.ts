import { getCoderByCoinType } from "@ensdomains/address-encoder";
import { hexToBytes } from "@ensdomains/address-encoder/utils";
import { createConfig } from "@wagmi/core";
import { type Address, type Hex, http, toCoinType } from "viem";
import { arbitrum, base, mainnet, optimism } from "viem/chains";
import { normalize } from "viem/ens";

export const wagmiConfig = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http("https://ethereum-rpc.publicnode.com"),
  },
});

export const normalizeEnsName = (name: string) => normalize(name.trim());

export const ENS_TEXT_RECORD_KEYS = [
  "description",
  "url",
  "website",
  "email",
  "com.github",
  "com.twitter",
  "com.discord",
  "org.telegram",
] as const;

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

export const ENS_ADDRESS_RECORD_ENTRIES = Object.entries(ENS_ADDRESS_RECORDS) as [
  EnsAddressRecordKey,
  typeof ENS_ADDRESS_RECORDS[EnsAddressRecordKey]
][];

export function decodeEnsAddress(address: Address | Hex, coinType: bigint): string | undefined {
  try {
    return getCoderByCoinType(Number(coinType)).encode(hexToBytes(address));
  } catch {
    return undefined;
  }
}
