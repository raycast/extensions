import bs58 from "bs58";

export interface ConversionResult {
  value: string;
  label: string;
}

export function detectAndConvert(input: string, iterations = 1): ConversionResult[] {
  const results: ConversionResult[] = [];
  const trimmed = input.trim();
  if (!trimmed) return results;

  // Helper for recursion result
  const suffix = iterations > 1 ? ` (${iterations} rounds)` : "";

  // 1. Try Decimal
  if (iterations === 1 && /^-?\d+$/.test(trimmed)) {
    const num = parseInt(trimmed, 10);
    if (!isNaN(num)) {
      results.push({ label: "Decimal", value: num.toString(10) });
      results.push({ label: "Binary", value: (num >>> 0).toString(2) });
      results.push({ label: "Octal", value: (num >>> 0).toString(8) });
      results.push({ label: "Hexadecimal", value: (num >>> 0).toString(16).toUpperCase() });
      if (num >= 32 && num <= 126) {
        results.push({ label: "ASCII", value: String.fromCharCode(num) });
      }
    }
  }

  // 2. Try Hexadecimal
  let hexStr = trimmed.replace(/\s+/g, "");
  if (hexStr.toLowerCase().startsWith("0x")) {
    hexStr = hexStr.slice(2);
  }
  if (iterations === 1 && /^[0-9a-fA-F]+$/.test(hexStr)) {
    const num = parseInt(hexStr, 16);
    const valDec = num.toString(10);
    results.push({ label: "Hex -> Decimal", value: valDec });
    results.push({ label: "Hex -> Binary", value: (num >>> 0).toString(2) });
    results.push({ label: "Hex -> Octal", value: (num >>> 0).toString(8) });
    if (hexStr.length % 2 === 0) {
      try {
        let str = "";
        for (let i = 0; i < hexStr.length; i += 2) {
          const byte = parseInt(hexStr.substr(i, 2), 16);
          if (byte >= 32 && byte <= 126) {
            str += String.fromCharCode(byte);
          } else {
            str += "·";
          }
        }
        results.push({ label: "Hex -> ASCII", value: str });
      } catch {
        /* ignore */
      }
    }
  }

  // 3. Try Binary
  let binStr = trimmed;
  if (trimmed.toLowerCase().startsWith("0b")) {
    binStr = trimmed.slice(2);
  }
  if (iterations === 1 && /^[01]+$/.test(binStr) && binStr.length > 0) {
    const num = parseInt(binStr, 2);
    results.push({ label: "Binary -> Decimal", value: num.toString(10) });
    results.push({ label: "Binary -> Hex", value: num.toString(16).toUpperCase() });
    results.push({ label: "Binary -> Octal", value: num.toString(8) });
  }

  // 4. Try Octal (0o... or just 0-7 chars)
  let octStr = trimmed;
  if (trimmed.toLowerCase().startsWith("0o")) {
    octStr = trimmed.slice(2);
  }
  if (iterations === 1 && /^[0-7]+$/.test(octStr) && octStr.length > 0) {
    const num = parseInt(octStr, 8);
    results.push({ label: "Octal -> Decimal", value: num.toString(10) });
    results.push({ label: "Octal -> Hex", value: num.toString(16).toUpperCase() });
    results.push({ label: "Octal -> Binary", value: num.toString(2) });
  }

  // 4. Input as ASCII -> Codecs (Encode)
  if (trimmed.length > 0) {
    if (iterations === 1) {
      let hexRes = "";
      let binRes = "";
      let octRes = "";
      let decRes = "";
      for (let i = 0; i < trimmed.length; i++) {
        const code = trimmed.charCodeAt(i);
        hexRes += code.toString(16).padStart(2, "0").toUpperCase() + " ";
        binRes += code.toString(2).padStart(8, "0") + " ";
        octRes += code.toString(8).padStart(3, "0") + " ";
        decRes += code.toString(10) + " ";
      }
      results.push({ label: "Text -> Hex", value: hexRes.trim() });
      results.push({ label: "Text -> Binary", value: binRes.trim() });
      results.push({ label: "Text -> Octal", value: octRes.trim() });
      results.push({ label: "Text -> Decimal", value: decRes.trim() });
    }

    // Text -> Base64 (Recursive Encode)
    try {
      let b64 = trimmed;
      for (let i = 0; i < iterations; i++) {
        b64 = Buffer.from(b64, "utf-8").toString("base64");
      }
      results.push({ label: "Text -> Base64" + suffix, value: b64 });
    } catch {
      /* ignore */
    }

    // Text -> Base58 (Recursive Encode)
    try {
      let b58 = trimmed;
      for (let i = 0; i < iterations; i++) {
        b58 = bs58.encode(Buffer.from(b58, "utf-8"));
      }
      results.push({ label: "Text -> Base58" + suffix, value: b58 });
    } catch {
      /* ignore */
    }

    // Text -> URL Encoded (Recursive)
    try {
      let urlEnc = trimmed;
      let changed = false;
      for (let i = 0; i < iterations; i++) {
        const next = encodeURIComponent(urlEnc);
        if (next !== urlEnc) changed = true;
        urlEnc = next;
      }
      if (changed) {
        results.push({ label: "Text -> URL Encoded" + suffix, value: urlEnc });
      }
    } catch {
      /* ignore */
    }

    // Text -> HTML Entities (Basic) - No recursion usually desired or standard?
    // Let's stick to simple 1 level for HTML entities or simple replacement.
    if (iterations === 1) {
      const htmlEnt = trimmed.replace(/[\u00A0-\u9999<>&]/g, function (i) {
        return "&#" + i.charCodeAt(0) + ";";
      });
      if (htmlEnt !== trimmed) {
        results.push({ label: "Text -> HTML Entity", value: htmlEnt });
      }
    }
  }

  // 5. Try Base64 (Recursive Decode)
  // We check if it is initially valid base64. Then we try to decode N times.
  // Note: Intermediate steps must also be valid? Or just try best effort?
  // Strict standard: only if full chain valid.
  const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  if (trimmed.length > 1 && base64Regex.test(trimmed)) {
    try {
      let current = trimmed;
      let valid = true;
      for (let i = 0; i < iterations; i++) {
        // Check validity before decoding? Or just try?
        // Buffer.from allows some forgiveness, but let's try.
        const decoded = Buffer.from(current, "base64").toString("utf-8");
        // If we decode to empty or strictly same (unlikely if valid b64), stop?
        if (!decoded) {
          valid = false;
          break;
        }
        current = decoded;
      }

      if (valid && current !== trimmed) {
        results.push({ label: "Base64 -> Text" + suffix, value: current });
      }
    } catch {
      /* ignore */
    }
  }

  // 6. Try Base58 (Recursive Decode)
  // Base58 chars: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  if (trimmed.length > 1 && base58Regex.test(trimmed)) {
    try {
      let current = trimmed;
      let valid = true;
      for (let i = 0; i < iterations; i++) {
        const decodedBuffer = bs58.decode(current);
        const decoded = Buffer.from(decodedBuffer).toString("utf-8");
        if (!decoded) {
          valid = false;
          break;
        }
        current = decoded;
      }

      if (valid && current !== trimmed) {
        results.push({ label: "Base58 -> Text" + suffix, value: current });
      }
    } catch {
      /* ignore */
    }
  }

  // 7. Try URL Encoded (Recursive Decode)
  if (trimmed.includes("%") || iterations > 1) {
    try {
      let current = trimmed;
      let changed = false;
      for (let i = 0; i < iterations; i++) {
        const decoded = decodeURIComponent(current);
        if (decoded !== current) changed = true;
        current = decoded;
      }
      if (changed) {
        results.push({ label: "URL Encoded -> Text" + suffix, value: current });
      }
    } catch {
      /* ignore */
    }
  }

  return results;
}
