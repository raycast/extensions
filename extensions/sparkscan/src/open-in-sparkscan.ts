import { showHUD, Clipboard, open } from "@raycast/api";

// Regular expressions taken from the sparkscan SearchInput implementation
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_NO_HYPHENS_PATTERN = /^[0-9a-f]{32}$/i;
const TXID_64_CHAR_PATTERN = /^[0-9a-f]{64}$/i;

// Basic public key check (compressed secp256k1 key)
function looksLikePublicKey(key: string): boolean {
  if (!key) return false;
  return key.length === 66 && /^(02|03)[0-9a-fA-F]{64}$/.test(key);
}

// Very lightweight spark address heuristic – any bech32‐like string starting with "sp" followed by the "1" separator.
function looksLikeSparkAddress(address: string): boolean {
  if (!address) return false;
  const lower = address.toLowerCase();
  return lower.startsWith("sp") && address.includes("1") && address.length > 10;
}

// Very lightweight token address heuristic – any bech32‐like string starting with "btkn" followed by the "1" separator.
function looksLikeTokenAddress(address: string): boolean {
  if (!address) return false;
  const lower = address.toLowerCase();
  return lower.startsWith("btkn") && address.includes("1") && address.length > 10;
}

type AddressType = "PUBLIC_KEY" | "SPARK_ADDRESS" | "TOKEN_ADDRESS" | "TXID" | "UNKNOWN";

function classifyInput(input: string): AddressType {
  const trimmed = input.trim();
  if (!trimmed) return "UNKNOWN";

  if (looksLikePublicKey(trimmed)) return "PUBLIC_KEY";

  if (UUID_PATTERN.test(trimmed) || UUID_NO_HYPHENS_PATTERN.test(trimmed) || TXID_64_CHAR_PATTERN.test(trimmed)) {
    return "TXID";
  }

  if (looksLikeSparkAddress(trimmed)) return "SPARK_ADDRESS";
  if (looksLikeTokenAddress(trimmed)) return "TOKEN_ADDRESS";

  return "UNKNOWN";
}

export default async function main() {
  const { text: clipboard } = await Clipboard.read();
  const addressType = classifyInput(clipboard);

  switch (addressType) {
    case "SPARK_ADDRESS":
      await open(`https://sparkscan.io/address/${clipboard}`);
      break;
    case "TXID":
      await open(`https://sparkscan.io/tx/${clipboard}`);
      break;
    case "TOKEN_ADDRESS":
      if (clipboard.toLowerCase().startsWith("btknrt1")) {
        await open(`https://sparkscan.io/token/${clipboard}?network=REGTEST`);
      } else {
        await open(`https://sparkscan.io/token/${clipboard}`);
      }
      break;
    default:
      await showHUD("Invalid input");
      break;
  }
}
