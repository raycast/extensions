import { CryptoConfig } from "../config/config.js";
import { BitOperations } from "../utils/bitOps.js";
import { Base64Encoder } from "../utils/encoder.js";
import { HexProcessor } from "../utils/hexUtils.js";
import { RandomGenerator } from "../utils/randomGen.js";

export class CryptoProcessor {
  readonly config: CryptoConfig;
  readonly bitOps: BitOperations;
  readonly b64encoder: Base64Encoder;
  readonly hexProcessor: HexProcessor;
  readonly randomGen: RandomGenerator;

  constructor(config: CryptoConfig | null = null) {
    this.config = config ?? new CryptoConfig();
    this.bitOps = new BitOperations(this.config);
    this.b64encoder = new Base64Encoder(this.config);
    this.hexProcessor = new HexProcessor(this.config);
    this.randomGen = new RandomGenerator(this.config);
  }

  private intToLeBytes(val: number, length = 4): number[] {
    let value = val >>> 0;
    const arr: number[] = [];
    for (let i = 0; i < length; i += 1) {
      arr.push(value & 0xff);
      value >>>= 8;
    }
    return arr;
  }

  private packUint64LE(value: number | bigint): Uint8Array {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(value));
    return new Uint8Array(buf);
  }

  private strToLenPrefixedBytes(text: string): number[] {
    const data = Buffer.from(text, "utf8");
    return [data.length, ...data];
  }

  envFingerprintA(ts: number, xorKey: number): number[] {
    const data = this.packUint64LE(ts);

    const sum1 = data.slice(1, 5).reduce((acc, cur) => acc + cur, 0);
    const sum2 = data.slice(5, 8).reduce((acc, cur) => acc + cur, 0);

    const mark = ((sum1 & 0xff) + sum2) & 0xff;
    data[0] = mark;

    for (let i = 0; i < data.length; i += 1) {
      const value = data[i] ?? 0;
      data[i] = value ^ xorKey;
    }

    return Array.from(data);
  }

  envFingerprintB(ts: number): number[] {
    return Array.from(this.packUint64LE(ts));
  }

  buildPayloadArray(
    hexParameter: string,
    a1Value: string,
    appIdentifier = "xhs-pc-web",
    stringParam = "",
    timestamp: number | null = null,
  ): number[] {
    const payload: number[] = [];

    payload.push(...this.config.VERSION_BYTES);

    const seed = this.randomGen.generateRandomInt();
    const seedBytes = this.intToLeBytes(seed, 4);
    payload.push(...seedBytes);
    const seedByte0 = seedBytes[0] ?? 0;

    const ts = timestamp ?? Date.now() / 1000;
    payload.push(...this.envFingerprintA(Math.trunc(ts * 1000), this.config.ENV_FINGERPRINT_XOR_KEY));

    const timeOffset = this.randomGen.generateRandomByteInRange(
      this.config.ENV_FINGERPRINT_TIME_OFFSET_MIN,
      this.config.ENV_FINGERPRINT_TIME_OFFSET_MAX,
    );
    payload.push(...this.envFingerprintB(Math.trunc((ts - timeOffset) * 1000)));

    const sequenceValue = this.randomGen.generateRandomByteInRange(
      this.config.SEQUENCE_VALUE_MIN,
      this.config.SEQUENCE_VALUE_MAX,
    );
    payload.push(...this.intToLeBytes(sequenceValue, 4));

    const windowPropsLength = this.randomGen.generateRandomByteInRange(
      this.config.WINDOW_PROPS_LENGTH_MIN,
      this.config.WINDOW_PROPS_LENGTH_MAX,
    );
    payload.push(...this.intToLeBytes(windowPropsLength, 4));

    const uriLength = Array.from(stringParam).length;
    payload.push(...this.intToLeBytes(uriLength, 4));

    const md5Bytes = Buffer.from(hexParameter, "hex");
    for (let i = 0; i < 8; i += 1) {
      payload.push((md5Bytes[i] ?? 0) ^ seedByte0);
    }

    payload.push(52);

    let a1Bytes = Buffer.from(a1Value, "utf8");
    if (a1Bytes.length > 52) {
      a1Bytes = a1Bytes.subarray(0, 52);
    } else if (a1Bytes.length < 52) {
      const padded = Buffer.alloc(52);
      a1Bytes.copy(padded, 0, 0, a1Bytes.length);
      a1Bytes = padded;
    }
    payload.push(...a1Bytes);

    payload.push(10);

    let sourceBytes = Buffer.from(appIdentifier, "utf8");
    if (sourceBytes.length > 10) {
      sourceBytes = sourceBytes.subarray(0, 10);
    } else if (sourceBytes.length < 10) {
      const padded = Buffer.alloc(10);
      sourceBytes.copy(padded, 0, 0, sourceBytes.length);
      sourceBytes = padded;
    }
    payload.push(...sourceBytes);

    payload.push(1);

    payload.push(this.config.CHECKSUM_VERSION);
    payload.push(seedByte0 ^ this.config.CHECKSUM_XOR_KEY);
    payload.push(...this.config.CHECKSUM_FIXED_TAIL);

    return payload;
  }
}
