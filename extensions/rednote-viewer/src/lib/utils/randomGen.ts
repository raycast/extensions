import crypto from "node:crypto";
import { CryptoConfig } from "../config/config.js";

type SeedInput = number | bigint | readonly number[] | Uint32Array;

/**
 * Lightweight Python-like Mersenne Twister to align random outputs with the Python implementation.
 */
class PythonLikeRandom {
  private static readonly N = 624;
  private static readonly M = 397;
  private static readonly MATRIX_A = 0x9908b0df;
  private static readonly UPPER_MASK = 0x80000000;
  private static readonly LOWER_MASK = 0x7fffffff;

  private readonly mt: Uint32Array = new Uint32Array(PythonLikeRandom.N);
  private index = PythonLikeRandom.N;

  constructor(seed?: SeedInput) {
    this.seed(seed);
  }

  private normalizeSeed(seed?: SeedInput): number[] {
    if (seed === undefined) {
      const buf = crypto.randomBytes(PythonLikeRandom.N * 4);
      const words: number[] = [];
      for (let i = 0; i < buf.length; i += 4) {
        words.push(buf.readUInt32LE(i));
      }
      return words;
    }
    if (typeof seed === "number") {
      seed = BigInt(Math.trunc(seed));
    }
    if (typeof seed === "bigint") {
      const words: number[] = [];
      let value = seed < 0 ? -seed : seed;
      if (value === 0n) return [0];
      while (value > 0) {
        words.push(Number(value & 0xffffffffn));
        value >>= 32n;
      }
      return words;
    }
    return Array.from(seed, (v) => Number(v) >>> 0);
  }

  private initByArray(seedWords: number[]): void {
    const { N } = PythonLikeRandom;
    this.mt[0] = 19650218;
    for (let i = 1; i < N; i += 1) {
      const prev = this.mt[i - 1] ?? 0;
      this.mt[i] = (Math.imul(1812433253, prev ^ (prev >>> 30)) + i) >>> 0;
    }

    let i = 1;
    let j = 0;
    const keyLen = seedWords.length;
    let k = Math.max(N, keyLen);
    while (k > 0) {
      const prev = this.mt[i - 1] ?? 0;
      const seedVal = seedWords[j] ?? 0;
      this.mt[i] = ((this.mt[i] ^ Math.imul(prev ^ (prev >>> 30), 1664525)) + seedVal + j) >>> 0;
      i += 1;
      j += 1;
      if (i >= N) {
        this.mt[0] = this.mt[N - 1] ?? 0;
        i = 1;
      }
      if (j >= keyLen) {
        j = 0;
      }
      k -= 1;
    }

    k = N - 1;
    while (k > 0) {
      const prev = this.mt[i - 1] ?? 0;
      this.mt[i] = ((this.mt[i] ^ Math.imul(prev ^ (prev >>> 30), 1566083941)) - i) >>> 0;
      i += 1;
      if (i >= N) {
        this.mt[0] = this.mt[N - 1] ?? 0;
        i = 1;
      }
      k -= 1;
    }
    this.mt[0] = 0x80000000;
    this.index = N;
  }

  seed(seed?: SeedInput): void {
    const words = this.normalizeSeed(seed);
    const seedWords = words.length > 0 ? words : [19650218];
    this.initByArray(seedWords);
  }

  private twist(): void {
    const { N, M, MATRIX_A, UPPER_MASK, LOWER_MASK } = PythonLikeRandom;
    for (let i = 0; i < N; i += 1) {
      const x = ((this.mt[i] ?? 0) & UPPER_MASK) + ((this.mt[(i + 1) % N] ?? 0) & LOWER_MASK);
      let xA = x >>> 1;
      if (x % 2 !== 0) {
        xA ^= MATRIX_A;
      }
      this.mt[i] = (this.mt[(i + M) % N] ?? 0) ^ xA;
    }
    this.index = 0;
  }

  nextUint32(): number {
    if (this.index >= PythonLikeRandom.N) {
      this.twist();
    }
    let y = this.mt[this.index] ?? 0;
    this.index += 1;

    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;

    return y >>> 0;
  }

  random(): number {
    const a = this.nextUint32() >>> 5;
    const b = this.nextUint32() >>> 6;
    return (a * 67108864 + b) / 9007199254740992;
  }

  private getRandBits(k: number): bigint {
    if (k <= 0) return 0n;
    if (k <= 32) {
      const r = this.nextUint32();
      return BigInt(r >>> (32 - k));
    }

    const words = Math.floor((k - 1) / 32) + 1;
    const wordArray: number[] = new Array(words);
    let remaining = k;
    for (let i = 0; i < words; i += 1, remaining -= 32) {
      let r = this.nextUint32();
      if (remaining < 32) {
        r >>>= 32 - remaining;
      }
      wordArray[i] = r >>> 0;
    }

    let bits = 0n;
    for (let i = wordArray.length - 1; i >= 0; i -= 1) {
      bits = (bits << 32n) | BigInt(wordArray[i] ?? 0);
    }
    return bits;
  }

  private randBelow(n: number): number {
    if (!Number.isFinite(n) || n <= 0) {
      throw new Error("Upper bound must be a positive integer");
    }
    if (n === 1) return 0;
    const bits = Math.floor(Math.log2(n)) + 1;
    while (true) {
      const r = this.getRandBits(bits);
      if (r < BigInt(n)) {
        return Number(r);
      }
    }
  }

  randIntInclusive(minVal: number, maxVal: number): number {
    if (!Number.isFinite(minVal) || !Number.isFinite(maxVal)) {
      throw new Error("Bounds must be finite numbers");
    }
    if (maxVal < minVal) {
      throw new Error("maxVal must be >= minVal");
    }
    const span = maxVal - minVal + 1;
    return this.randBelow(span) + minVal;
  }

  randByte(): number {
    return this.randIntInclusive(0, 255);
  }
}

export class RandomGenerator {
  private readonly config: CryptoConfig;
  private readonly rng: PythonLikeRandom;

  constructor(config: CryptoConfig) {
    this.config = config;
    this.rng = new PythonLikeRandom(this.config.RANDOM_SEED);
  }

  generateRandomBytes(byteCount: number): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < byteCount; i += 1) {
      bytes.push(this.rng.randByte());
    }
    return bytes;
  }

  generateRandomByteInRange(minVal: number, maxVal: number): number {
    return this.rng.randIntInclusive(minVal, maxVal);
  }

  generateRandomInt(): number {
    return this.rng.randIntInclusive(0, this.config.MAX_32BIT);
  }

  generateB3TraceId(): string {
    let result = "";
    for (let i = 0; i < this.config.B3_TRACE_ID_LENGTH; i += 1) {
      const idx = this.rng.randIntInclusive(0, this.config.HEX_CHARS.length - 1);
      result += this.config.HEX_CHARS[idx] ?? "";
    }
    return result;
  }

  generateXrayTraceId(timestamp?: number, seq?: number): string {
    const ts = typeof timestamp === "number" ? timestamp : Date.now();
    const sequence = typeof seq === "number" ? seq : this.rng.randIntInclusive(0, this.config.XRAY_TRACE_ID_SEQ_MAX);

    const part1 = ((BigInt(ts) << BigInt(this.config.XRAY_TRACE_ID_TIMESTAMP_SHIFT)) | BigInt(sequence))
      .toString(16)
      .padStart(this.config.XRAY_TRACE_ID_PART1_LENGTH, "0");

    let part2 = "";
    for (let i = 0; i < this.config.XRAY_TRACE_ID_PART2_LENGTH; i += 1) {
      const idx = this.rng.randIntInclusive(0, this.config.HEX_CHARS.length - 1);
      part2 += this.config.HEX_CHARS[idx] ?? "";
    }

    return `${part1}${part2}`;
  }
}
