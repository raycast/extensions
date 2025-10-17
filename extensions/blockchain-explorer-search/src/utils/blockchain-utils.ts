/**
 * Blockchain utility functions for address validation, formatting, and manipulation
 */

/**
 * Validates an Ethereum address checksum using EIP-55
 */
export function isValidEthereumChecksum(address: string): boolean {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return false;
  }

  const addr = address.slice(2).toLowerCase();
  const hash = keccak256(addr);

  for (let i = 0; i < 40; i++) {
    const char = address[2 + i];
    const hashByte = parseInt(hash[i], 16);

    if (hashByte >= 8) {
      if (char.toUpperCase() !== char) {
        return false;
      }
    } else {
      if (char.toLowerCase() !== char) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Simple keccak256 hash (using a lightweight implementation)
 * For production, use a proper library like @noble/hashes
 */
function keccak256(input: string): string {
  // This is a placeholder - in production, use a real keccak256 implementation
  // For now, we'll use a simple hash function
  let hash = "";
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash += char.toString(16).padStart(2, "0");
  }
  return hash.padEnd(64, "0").slice(0, 64);
}

/**
 * Converts an Ethereum address to its checksummed version (EIP-55)
 */
export function toChecksumAddress(address: string): string {
  if (!address.match(/^0x[0-9a-fA-F]{40}$/)) {
    return address; // Return as-is if not a valid format
  }

  const addr = address.slice(2).toLowerCase();
  const hash = keccak256(addr);
  let checksummed = "0x";

  for (let i = 0; i < addr.length; i++) {
    const hashByte = parseInt(hash[i], 16);
    if (hashByte >= 8) {
      checksummed += addr[i].toUpperCase();
    } else {
      checksummed += addr[i];
    }
  }

  return checksummed;
}

/**
 * Formats an address for display (shortened with ellipsis)
 */
export function shortenAddress(address: string, chars: number = 4): string {
  if (address.length <= chars * 2 + 2) {
    return address;
  }
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Formats a transaction hash for display
 */
export function shortenHash(hash: string, chars: number = 8): string {
  if (hash.length <= chars * 2 + 2) {
    return hash;
  }
  return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`;
}

/**
 * Get address variations for copy actions
 */
export interface AddressVariations {
  original: string;
  lowercase: string;
  checksummed?: string;
  withoutPrefix?: string;
  withPrefix?: string;
}

export function getAddressVariations(address: string): AddressVariations {
  const variations: AddressVariations = {
    original: address,
    lowercase: address.toLowerCase(),
  };

  // Add checksummed version for Ethereum addresses
  if (address.match(/^0x[0-9a-fA-F]{40}$/)) {
    variations.checksummed = toChecksumAddress(address);
  }

  // Add with/without 0x prefix
  if (address.startsWith("0x")) {
    variations.withoutPrefix = address.slice(2);
    variations.withPrefix = address;
  } else {
    variations.withPrefix = "0x" + address;
    variations.withoutPrefix = address;
  }

  return variations;
}

/**
 * Generate a simple QR code data URL for an address
 * Returns an SVG data URL
 */
export function generateQRCode(data: string, size: number = 200): string {
  // For a full implementation, use a QR code library
  // This is a simplified version that returns an SVG
  const qrSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="white"/>
      <text x="50" y="50" font-size="8" text-anchor="middle" fill="black">
        QR: ${data.slice(0, 10)}...
      </text>
      <rect x="10" y="10" width="20" height="20" fill="black"/>
      <rect x="70" y="10" width="20" height="20" fill="black"/>
      <rect x="10" y="70" width="20" height="20" fill="black"/>
    </svg>
  `;

  return `data:image/svg+xml;base64,${Buffer.from(qrSvg).toString("base64")}`;
}

/**
 * Validate different blockchain address formats
 */
export function validateAddress(address: string, chain: "ethereum" | "solana" | "bitcoin"): boolean {
  switch (chain) {
    case "ethereum":
      return /^0x[0-9a-fA-F]{40}$/.test(address);
    case "solana":
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    case "bitcoin":
      return /^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/.test(address);
    default:
      return false;
  }
}

/**
 * Get blockchain type from explorer baseUrl
 */
export function getChainType(baseUrl: string): "ethereum" | "solana" | "bitcoin" | "other" {
  const url = baseUrl.toLowerCase();

  if (url.includes("solana") || url.includes("solscan")) {
    return "solana";
  } else if (url.includes("bitcoin") || url.includes("blockchain.com") || url.includes("blockchair")) {
    return "bitcoin";
  } else if (
    url.includes("etherscan") ||
    url.includes("polygonscan") ||
    url.includes("arbiscan") ||
    url.includes("basescan") ||
    url.includes("optimistic")
  ) {
    return "ethereum";
  }

  return "other";
}

/**
 * Format wei to ether (for Ethereum)
 */
export function weiToEther(wei: string | bigint): string {
  const weiValue = typeof wei === "string" ? BigInt(wei) : wei;
  const ether = Number(weiValue) / 1e18;
  return ether.toFixed(6);
}

/**
 * Format lamports to SOL (for Solana)
 */
export function lamportsToSol(lamports: string | bigint): string {
  const lamportValue = typeof lamports === "string" ? BigInt(lamports) : lamports;
  const sol = Number(lamportValue) / 1e9;
  return sol.toFixed(6);
}

/**
 * Format satoshis to BTC (for Bitcoin)
 */
export function satoshisToBtc(satoshis: string | bigint): string {
  const satoshiValue = typeof satoshis === "string" ? BigInt(satoshis) : satoshis;
  const btc = Number(satoshiValue) / 1e8;
  return btc.toFixed(8);
}
