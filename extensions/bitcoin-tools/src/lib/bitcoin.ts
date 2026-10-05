import { HD, P2PKH, PrivateKey, Transaction, Utils } from "@bsv/sdk";

const HEX_PATTERN = /^[0-9a-f]+$/i;
const MAINNET_WIF_PREFIX = 0x80;
const TESTNET_WIF_PREFIX = 0xef;

export type BitcoinNetwork = "mainnet" | "testnet";

export interface WifAddress {
  address: string;
  network: BitcoinNetwork;
}

export interface DecodedTransactionInput {
  index: number;
  sourceTransactionId: string;
  sourceOutputIndex: number;
  sequence: number;
  unlockingScriptHex: string;
  unlockingScriptAsm: string;
}

export interface DecodedTransactionOutput {
  index: number;
  satoshis: number;
  lockingScriptHex: string;
  lockingScriptAsm: string;
}

export interface DecodedTransaction {
  transactionId: string;
  version: number;
  lockTime: number;
  sizeBytes: number;
  totalOutputSatoshis: number;
  rawTransaction: string;
  inputs: DecodedTransactionInput[];
  outputs: DecodedTransactionOutput[];
}

function normalizeHex(value: string, label: string): string {
  const normalized = value
    .trim()
    .replace(/^0x/i, "")
    .replaceAll(/\s/g, "")
    .toLowerCase();

  if (
    normalized.length === 0 ||
    normalized.length % 2 !== 0 ||
    !HEX_PATTERN.test(normalized)
  ) {
    throw new Error(`${label} must be an even-length hexadecimal value.`);
  }

  return normalized;
}

export function addressFromWif(value: string): WifAddress {
  const wif = value.trim();
  if (wif.length === 0) {
    throw new Error("WIF is required.");
  }

  const decoded = Utils.fromBase58Check(wif);
  const prefix = Array.isArray(decoded.prefix) ? decoded.prefix[0] : Number.NaN;
  const network =
    prefix === MAINNET_WIF_PREFIX
      ? "mainnet"
      : prefix === TESTNET_WIF_PREFIX
        ? "testnet"
        : undefined;

  if (!network) {
    throw new Error("WIF must use the BSV mainnet or testnet prefix.");
  }

  const privateKey = PrivateKey.fromWif(wif);
  return { address: privateKey.toAddress(network), network };
}

export function addressFromPublicKeyHash(
  value: string,
  network: BitcoinNetwork = "mainnet",
): string {
  const publicKeyHash = normalizeHex(value, "Public key hash");
  if (publicKeyHash.length !== 40) {
    throw new Error(
      "Public key hash must contain exactly 20 bytes (40 hexadecimal characters).",
    );
  }

  const prefix = network === "mainnet" ? [0x00] : [0x6f];
  return Utils.toBase58Check(Utils.toArray(publicKeyHash, "hex"), prefix);
}

export function p2pkhScriptFromAddress(addressValue: string): {
  asm: string;
  hex: string;
} {
  const address = addressValue.trim();
  const decoded = Utils.fromBase58Check(address);
  const data = Array.isArray(decoded.data) ? decoded.data : [];
  const prefix = Array.isArray(decoded.prefix) ? decoded.prefix[0] : Number.NaN;

  if (data.length !== 20 || (prefix !== 0x00 && prefix !== 0x6f)) {
    throw new Error(
      "Address must be a valid BSV P2PKH mainnet or testnet address.",
    );
  }

  const script = new P2PKH().lock(address);
  return { asm: script.toASM(), hex: script.toHex() };
}

export function generateAddress(): string {
  return PrivateKey.fromRandom().toAddress("mainnet");
}

export function generateWif(): string {
  return PrivateKey.fromRandom().toWif();
}

export function generateXpriv(): string {
  return HD.fromRandom().toString();
}

export function generateXpub(): string {
  return HD.fromRandom().toPublic().toString();
}

export function decodeTransaction(rawValue: string): DecodedTransaction {
  const rawTransaction = normalizeHex(rawValue, "Raw transaction");
  const reader = new Utils.Reader(Utils.toArray(rawTransaction, "hex"));
  const transaction = Transaction.fromReader(reader);

  if (!reader.eof() || transaction.toHex() !== rawTransaction) {
    throw new Error("Raw transaction contains trailing or non-canonical data.");
  }

  const inputs = transaction.inputs.map((input, index) => ({
    index,
    sourceTransactionId:
      input.sourceTXID ?? input.sourceTransaction?.id("hex") ?? "",
    sourceOutputIndex: input.sourceOutputIndex,
    sequence: input.sequence ?? 0xffffffff,
    unlockingScriptHex: input.unlockingScript?.toHex() ?? "",
    unlockingScriptAsm: input.unlockingScript?.toASM() ?? "",
  }));

  const outputs = transaction.outputs.map((output, index) => ({
    index,
    satoshis: output.satoshis ?? 0,
    lockingScriptHex: output.lockingScript.toHex(),
    lockingScriptAsm: output.lockingScript.toASM(),
  }));

  return {
    transactionId: transaction.id("hex"),
    version: transaction.version,
    lockTime: transaction.lockTime,
    sizeBytes: rawTransaction.length / 2,
    totalOutputSatoshis: outputs.reduce(
      (total, output) => total + output.satoshis,
      0,
    ),
    rawTransaction,
    inputs,
    outputs,
  };
}
