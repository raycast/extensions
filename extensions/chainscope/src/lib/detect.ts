import { isAddress, isHex, size } from "viem";
import bs58 from "bs58";

export type DetectedKind =
  | "address"
  | "ensName"
  | "txHash"
  | "calldata"
  | "number"
  | "hex"
  | "solanaSig"
  | "solanaAddress"
  | "unknown"
  | "empty";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,90}$/;

export type Detection = {
  kind: DetectedKind;
  value: string;
};

// A 32-byte hex may be a tx hash or bytes32; Decode tries the tx first.
export function detect(raw: string): Detection {
  const value = raw.trim();
  if (!value) return { kind: "empty", value };

  if (isAddress(value, { strict: false })) return { kind: "address", value };

  if (/^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/i.test(value)) return { kind: "ensName", value };

  if (isHex(value)) {
    const bytes = size(value);
    if (bytes === 32) return { kind: "txHash", value };
    if (bytes >= 4) return { kind: "calldata", value };
    return { kind: "hex", value };
  }

  if (/^\d+(\.\d+)?$/.test(value)) return { kind: "number", value };

  // 64 bytes = signature, 32 = pubkey.
  if (BASE58.test(value)) {
    try {
      const len = bs58.decode(value).length;
      if (len === 64) return { kind: "solanaSig", value };
      if (len === 32) return { kind: "solanaAddress", value };
    } catch {
      // not valid base58
    }
  }

  return { kind: "unknown", value };
}
