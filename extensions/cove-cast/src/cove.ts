/**
 * Cove deep-link protocol.
 *
 * Reference: https://docs.cove.trade/builders/deep-links
 *
 * Links are base62-encoded and fit within Telegram's 64-char `/start` limit:
 *   g_{amount}{chainCode}{base62Token}{COVE_TAIL}   immediate buy
 *   b_{chainCode}{base62Token}{COVE_TAIL}           market buy panel
 */

export const BASE62_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** Telegram caps the /start payload at 64 characters. */
export const MAX_PAYLOAD_LENGTH = 64;

export type ChainType = "evm" | "solana";
export type LinkKind = "g" | "b";

/** Dexscreener chainId -> Cove chain code. */
export const COVE_CHAIN_CODES: Record<string, string> = {
  ethereum: "e",
  base: "b",
  bsc: "n",
  megaeth: "m",
  solana: "s",
  // Best-effort mappings for Cove's newer chains; their Dexscreener ids vary
  // and may need adjusting here if one is wrong.
  tempo: "t",
  monad: "o",
  story: "y",
  hyperevm: "h",
  plasma: "p",
  robinhood: "r",
};

/** Base62-encoded token widths, by chain type. */
const TOKEN_WIDTH: Record<ChainType, number> = { evm: 27, solana: 43 };
const TOKEN_BYTES: Record<ChainType, number> = { evm: 20, solana: 32 };

const B58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function bigintToBase62(value: bigint, width: number): string {
  if (value < 0n) throw new Error("base62 cannot encode a negative value");
  if (value === 0n) return "0".repeat(width);
  let result = "";
  let n = value;
  while (n > 0n) {
    result = BASE62_ALPHABET[Number(n % 62n)] + result;
    n /= 62n;
  }
  return result.padStart(width, "0");
}

export function base62ToBigInt(str: string): bigint {
  let n = 0n;
  for (const ch of str) {
    const idx = BASE62_ALPHABET.indexOf(ch);
    if (idx < 0) throw new Error(`invalid base62 character: ${ch}`);
    n = n * 62n + BigInt(idx);
  }
  return n;
}

export function bytesToBase62(bytes: Uint8Array, width: number): string {
  let n = 0n;
  for (const byte of bytes) n = (n << 8n) | BigInt(byte);
  return bigintToBase62(n, width);
}

export function base62ToBytes(str: string, byteLength: number): Uint8Array {
  let n = base62ToBigInt(str);
  const bytes = new Uint8Array(byteLength);
  for (let i = byteLength - 1; i >= 0; i--) {
    bytes[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return bytes;
}

export function hexToBytes(hex: string): Uint8Array {
  const clean =
    hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(clean)) {
    throw new Error(`invalid hex string: ${hex}`);
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function base58Decode(str: string): Uint8Array {
  let n = 0n;
  for (const ch of str) {
    const idx = B58_ALPHABET.indexOf(ch);
    if (idx < 0) throw new Error(`invalid base58 character: ${ch}`);
    n = n * 58n + BigInt(idx);
  }
  const bytes: number[] = [];
  while (n > 0n) {
    bytes.unshift(Number(n & 0xffn));
    n >>= 8n;
  }
  // Each leading '1' in base58 represents a leading zero byte.
  for (const ch of str) {
    if (ch === "1") bytes.unshift(0);
    else break;
  }
  return Uint8Array.from(bytes);
}

/** Encode a contract address to its fixed-width base62 token form. */
export function encodeToken(ca: string, type: ChainType): string {
  const bytes = type === "evm" ? hexToBytes(ca) : base58Decode(ca);
  if (bytes.length !== TOKEN_BYTES[type]) {
    throw new Error(
      `expected ${TOKEN_BYTES[type]} bytes for ${type}, got ${bytes.length}`,
    );
  }
  return bytesToBase62(bytes, TOKEN_WIDTH[type]);
}

/**
 * Encode a USD amount: `d` replaces the decimal point, 1-4 chars, 0 < value <= 9999.
 * 25 -> "25", 0.5 -> "0d5", 0.05 -> "0d05".
 */
export function encodeUsdAmount(value: number): string {
  if (!Number.isFinite(value) || value <= 0 || value > 9999) {
    throw new Error(`amount out of range (0, 9999]: ${value}`);
  }
  const encoded = String(value).replace(".", "d");
  if (encoded.length > 4 || !/^[0-9]+(d[0-9]+)?$/.test(encoded)) {
    throw new Error(`amount ${value} does not fit the 4-char USD field`);
  }
  return encoded;
}

/** Resolve a Cove chain code from a Dexscreener chainId, applying overrides first. */
export function coveChainCode(
  chainId: string,
  overrides?: Record<string, string>,
): string | undefined {
  return overrides?.[chainId] ?? COVE_CHAIN_CODES[chainId];
}

/** Encode a Telegram id (user or group) to 7 base62 chars, stripping the -100 group prefix. */
export function encodeTelegramId(id: string): string {
  let raw = id.trim();
  if (raw.startsWith("-100")) raw = raw.slice(4);
  if (!/^\d+$/.test(raw)) throw new Error(`invalid Telegram id: ${id}`);
  return bigintToBase62(BigInt(raw), 7);
}

export type BuildOptions = {
  kind: LinkKind;
  chainId: string;
  ca: string;
  type: ChainType;
  amount?: number;
  botUsername: string;
  chainCodeOverrides?: Record<string, string>;
};

export const COVE_TAIL = encodeTelegramId("876274588") + "0000000";

/** Build the Cove `/start` payload (the part after `start=`). */
export function buildPayload(opts: BuildOptions): string {
  const code = coveChainCode(opts.chainId, opts.chainCodeOverrides);
  if (!code) throw new Error(`no Cove chain code for "${opts.chainId}"`);

  const token = encodeToken(opts.ca, opts.type);

  let payload: string;
  if (opts.kind === "g") {
    if (opts.amount === undefined)
      throw new Error("g_ links require an amount");
    payload = `g_${encodeUsdAmount(opts.amount)}${code}${token}${COVE_TAIL}`;
  } else {
    payload = `b_${code}${token}${COVE_TAIL}`;
  }

  if (payload.length > MAX_PAYLOAD_LENGTH) {
    throw new Error(
      `payload exceeds Telegram's ${MAX_PAYLOAD_LENGTH}-char limit`,
    );
  }
  return payload;
}

/** Build the full Cove deeplink URL (https — opens via the browser/`t.me`). */
export function buildDeeplink(opts: BuildOptions): string {
  return `https://t.me/${opts.botUsername}?start=${buildPayload(opts)}`;
}

/** Build a tg:// deeplink that opens the Telegram app directly (no browser hop). */
export function buildTgDeeplink(opts: BuildOptions): string {
  return `tg://resolve?domain=${opts.botUsername}&start=${buildPayload(opts)}`;
}
