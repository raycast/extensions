import {
  formatEther,
  formatGwei,
  getAddress,
  hexToBigInt,
  hexToString,
  isHex,
  keccak256,
  numberToHex,
  pad,
  parseEther,
  parseGwei,
  stringToHex,
  toEventSelector,
  toFunctionSelector,
  type Hex,
} from "viem";

export type Row = { label: string; value: string; hint?: string };

function safe(fn: () => string): string | null {
  try {
    const v = fn();
    return v === "" ? null : v;
  } catch {
    return null;
  }
}

function push(rows: Row[], label: string, fn: () => string, hint?: string) {
  const v = safe(fn);
  if (v !== null) rows.push({ label, value: v, hint });
}

// Spreadsheets run cells starting with these; plain negative numbers stay numeric.
export function csvCell(s: string): string {
  const safe = /^\s*[=+\-@]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function uniqueFileName(name: string, taken: (candidate: string) => boolean): string {
  if (!taken(name)) return name;
  const dot = name.lastIndexOf(".");
  for (let i = 2; ; i++) {
    const candidate = `${name.slice(0, dot)} (${i})${name.slice(dot)}`;
    if (!taken(candidate)) return candidate;
  }
}

export function convertUnits(raw: string): Row[] {
  const input = raw.trim();
  const rows: Row[] = [];
  if (!input) return rows;

  if (isHex(input)) {
    const big = hexToBigInt(input);
    push(rows, "Decimal", () => big.toString());
    push(rows, "bytes32 (left-pad)", () => pad(input as Hex, { size: 32 }));
    push(rows, "As wei → gwei", () => formatGwei(big));
    push(rows, "As wei → ether", () => formatEther(big));
    push(rows, "UTF-8", () => {
      const s = hexToString(input as Hex);
      return /^[\x20-\x7e]+$/.test(s) ? s : "";
    });
    return rows;
  }

  if (/^\d+(\.\d+)?$/.test(input)) {
    const isInteger = !input.includes(".");
    if (isInteger) {
      const big = BigInt(input);
      push(rows, "Hex", () => numberToHex(big));
      push(rows, "bytes32 (left-pad)", () => pad(numberToHex(big), { size: 32 }));
      push(rows, "As wei → gwei", () => formatGwei(big));
      push(rows, "As wei → ether", () => formatEther(big));
    }
    push(rows, "As gwei → wei", () => parseGwei(input).toString());
    push(rows, "As ether → wei", () => parseEther(input).toString());
    return rows;
  }

  push(rows, "UTF-8 → hex", () => stringToHex(input));
  push(rows, "Byte length", () => String(new TextEncoder().encode(input).length));
  return rows;
}

export function hashAndSelector(raw: string): Row[] {
  const input = raw.trim();
  const rows: Row[] = [];
  if (!input) return rows;

  push(rows, "keccak256 (UTF-8)", () => keccak256(stringToHex(input)));

  if (/^[a-zA-Z_]\w*\s*\(.*\)$/.test(input)) {
    const normalized = input.replace(/\s+/g, "");
    push(
      rows,
      "Function selector (4-byte)",
      () => toFunctionSelector(normalized),
      "first 4 bytes of keccak256(signature)",
    );
    push(rows, "Event topic (32-byte)", () => toEventSelector(normalized), "full keccak256(signature)");
  }

  return rows;
}

export function checksum(address: string): string {
  return getAddress(address);
}
