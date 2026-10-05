import bip39 from "bip39";
import * as bitcoin from "bitcoinjs-lib";
import {
  derivePath as deriveEd25519Path,
  getPublicKey as getEd25519PublicKey,
} from "ed25519-hd-key";
import { HDNodeWallet } from "ethers";

import type { WalletResult } from "./types";

const EVM_PATH = "m/44'/60'/0'/0/0";
const BTC_PATH = "m/84'/0'/0'/0/0";
const SOL_PATH = "m/44'/501'/0'/0'";
const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function encodeBase58(bytes: Uint8Array): string {
  let value = BigInt(`0x${Buffer.from(bytes).toString("hex")}`);
  let encoded = "";

  while (value > 0n) {
    encoded = BASE58_ALPHABET[Number(value % 58n)] + encoded;
    value /= 58n;
  }

  for (const byte of bytes) {
    if (byte !== 0) break;
    encoded = `1${encoded}`;
  }

  return encoded;
}

export function generateMnemonic(wordCount: 12 | 24): string {
  return bip39.generateMnemonic(wordCount === 24 ? 256 : 128);
}

export function buildWalletResult(mnemonic: string): WalletResult {
  if (!bip39.validateMnemonic(mnemonic))
    throw new Error("Invalid BIP39 mnemonic");

  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const btcChild = HDNodeWallet.fromSeed(seed).derivePath(BTC_PATH);
  const btcAddress = bitcoin.payments.p2wpkh({
    pubkey: Buffer.from(
      btcChild.signingKey.compressedPublicKey.slice(2),
      "hex",
    ),
    network: bitcoin.networks.bitcoin,
  }).address;

  if (!btcAddress) throw new Error("Failed to derive BTC address");

  const { key } = deriveEd25519Path(SOL_PATH, seed.toString("hex"));
  const solAddress = encodeBase58(getEd25519PublicKey(Buffer.from(key), false));

  return {
    mnemonic,
    chains: {
      evm: {
        path: EVM_PATH,
        address: HDNodeWallet.fromPhrase(mnemonic, undefined, EVM_PATH).address,
      },
      btc: {
        type: "P2WPKH (Native SegWit)",
        path: BTC_PATH,
        address: btcAddress,
      },
      sol: { path: SOL_PATH, address: solAddress },
    },
  };
}
