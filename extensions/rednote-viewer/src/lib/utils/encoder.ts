import { CryptoConfig } from "../config/config.js";

type Encodable = string | ArrayBufferView | Iterable<number>;

function buildTranslateTable(from: string, to: string): Map<string, string> {
  const table = new Map<string, string>();
  for (let i = 0; i < from.length; i += 1) {
    table.set(from[i]!, to[i]!);
  }
  return table;
}

function translateAlphabet(input: string, table: Map<string, string>): string {
  return Array.from(input, (ch) => table.get(ch) ?? ch).join("");
}

export class Base64Encoder {
  private readonly customEncodeTable: Map<string, string>;
  private readonly customDecodeTable: Map<string, string>;
  private readonly x3EncodeTable: Map<string, string>;
  private readonly x3DecodeTable: Map<string, string>;

  constructor(private readonly config: CryptoConfig) {
    this.customEncodeTable = buildTranslateTable(config.STANDARD_BASE64_ALPHABET, config.CUSTOM_BASE64_ALPHABET);
    this.customDecodeTable = buildTranslateTable(config.CUSTOM_BASE64_ALPHABET, config.STANDARD_BASE64_ALPHABET);
    this.x3EncodeTable = buildTranslateTable(config.STANDARD_BASE64_ALPHABET, config.X3_BASE64_ALPHABET);
    this.x3DecodeTable = buildTranslateTable(config.X3_BASE64_ALPHABET, config.STANDARD_BASE64_ALPHABET);
  }

  private toBuffer(data: Encodable): Buffer {
    if (typeof data === "string") {
      return Buffer.from(data, "utf8");
    }
    if (ArrayBuffer.isView(data)) {
      return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    }
    return Buffer.from(Array.from(data, (v) => Number(v) & 0xff));
  }

  encode(dataToEncode: Encodable): string {
    const dataBytes = this.toBuffer(dataToEncode);
    const standardEncoded = dataBytes.toString("base64");
    return translateAlphabet(standardEncoded, this.customEncodeTable);
  }

  decode(encodedString: string): string {
    const standard = translateAlphabet(encodedString, this.customDecodeTable);
    try {
      const decoded = Buffer.from(standard, "base64");
      return decoded.toString("utf8");
    } catch {
      throw new Error("Invalid Base64 input: unable to decode string");
    }
  }

  decodeX3(encodedString: string): Uint8Array {
    const standard = translateAlphabet(encodedString, this.x3DecodeTable);
    try {
      const decoded = Buffer.from(standard, "base64");
      return new Uint8Array(decoded);
    } catch {
      throw new Error("Invalid Base64 input: unable to decode string");
    }
  }

  encodeX3(inputBytes: ArrayBufferView | Uint8Array): string {
    const buffer = this.toBuffer(inputBytes);
    const standard = buffer.toString("base64");
    return translateAlphabet(standard, this.x3EncodeTable);
  }
}
