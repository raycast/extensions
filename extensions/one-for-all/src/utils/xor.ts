export enum InputType {
  Auto = "auto",
  ASCII = "ascii",
  Hex = "hex",
  Decimal = "decimal",
  Binary = "binary",
}

export enum OutputType {
  Hex = "hex",
  ASCII = "ascii",
  Decimal = "decimal",
  Binary = "binary",
}

export function parseInput(input: string, type: InputType): Buffer {
  if (!input) return Buffer.alloc(0);
  const trimmed = input.trim();

  try {
    switch (type) {
      case InputType.Hex:
        // Strip spaces for hex
        return Buffer.from(trimmed.replace(/\s+/g, ""), "hex");
      case InputType.Binary: {
        // Binary to buffer
        // Strip spaces first
        const binStr = trimmed.replace(/\s+/g, "");
        const paddedBin = binStr.padStart(Math.ceil(binStr.length / 8) * 8, "0");
        const binBytes = paddedBin.match(/.{1,8}/g)?.map((b) => parseInt(b, 2));
        return Buffer.from(binBytes || []);
      }

      case InputType.Decimal: {
        // Decimal string to number -> buffer?
        if (trimmed.includes(" ")) {
          const decBytes = trimmed.split(/\s+/).map((d) => parseInt(d, 10));
          return Buffer.from(decBytes);
        } else {
          // One number
          const num = BigInt(trimmed);
          // Convert BigInt to Buffer (hex)
          let hex = num.toString(16);
          if (hex.length % 2 !== 0) hex = "0" + hex;
          return Buffer.from(hex, "hex");
        }
      }

      case InputType.ASCII: {
        return Buffer.from(input, "utf-8"); // Keep original with spaces if ASCII
      }

      case InputType.Auto:
      default: {
        // Auto-detect
        const clean = trimmed.replace(/\s+/g, "");

        if (trimmed.startsWith("0x") || (/^[0-9a-fA-F]+$/.test(clean) && clean.length > 2)) {
          if (clean.length % 2 === 0) return Buffer.from(clean.replace(/^0x/i, ""), "hex");
        }

        if (trimmed.startsWith("0b") || /^[01]+$/.test(clean)) {
          const bContent = clean.replace(/^0b/i, "");
          const padded = bContent.padStart(Math.ceil(bContent.length / 8) * 8, "0");
          const bBytes = padded.match(/.{1,8}/g)?.map((b) => parseInt(b, 2));
          return Buffer.from(bBytes || []);
        }

        return Buffer.from(input, "utf-8");
      }
    }
  } catch {
    return Buffer.alloc(0);
  }
}

export function performXor(a: Buffer, b: Buffer): Buffer {
  if (a.length === 0 || b.length === 0) return Buffer.alloc(0);

  // Choose longer one as base? Or A as Data/B as Key?
  // User didn't specify. Standard XOR usually implies Data ^ Key.
  // Let's assume A is Data, B is Key.
  // If Key (B) is shorter, repeat it.
  // If Data (A) is shorter, repeat it? No, usually you decrypt specific data.
  // So: Iterate over A, XOR with B (cycling B).
  // Wait: If A and B are swapped, result is same length as A?
  // Let's make length = max(A, B)?
  // Convention: If one is clearly "data" (e.g. longer), preserve its length.
  // But what if they are equal "files"?
  // Raycast command: A is Clipboard (probably Data), B is Input (probably Key).
  // So let's output length of A.

  // CORRECTION: User might want to XOR two equal streams.
  // Let's accept that we output length = length of A.
  // And cycle B.

  const result = Buffer.alloc(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] ^ b[i % b.length];
  }
  return result;
}

export function formatOutput(data: Buffer, type: OutputType): string {
  if (data.length === 0) return "";
  switch (type) {
    case OutputType.Hex:
      return data.toString("hex").toUpperCase();
    case OutputType.ASCII: {
      // Use safe buffer to string, maybe replace unprintable?
      // checking if printable
      let str = "";
      for (const byte of data) {
        if (byte >= 32 && byte <= 126) {
          str += String.fromCharCode(byte);
        } else {
          str += "·";
        }
      }
      return str;
    }
    case OutputType.Decimal:
      // Space separated decimal bytes
      return Array.from(data)
        .map((b) => b.toString(10))
        .join(" ");
    case OutputType.Binary:
      return Array.from(data)
        .map((b) => b.toString(2).padStart(8, "0"))
        .join(" ");
  }
}
