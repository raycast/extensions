import { CryptoConfig } from "../config/config.js";

export class BitOperations {
  private readonly config: CryptoConfig;

  constructor(config: CryptoConfig) {
    this.config = config;
  }

  normalizeTo32bit(value: number): number {
    return (value & this.config.MAX_32BIT) >>> 0;
  }

  toSigned32bit(unsignedValue: number): number {
    return unsignedValue > this.config.MAX_SIGNED_32BIT ? unsignedValue - 0x100000000 : unsignedValue;
  }

  computeSeedValue(seed32Bit: number): number {
    const normalizedSeed = this.normalizeTo32bit(seed32Bit);

    const shift15Bits = normalizedSeed >>> 15;
    const shift13Bits = normalizedSeed >>> 13;
    const shift12Bits = normalizedSeed >>> 12;
    const shift10Bits = normalizedSeed >>> 10;

    const xorMaskedResult = (shift15Bits & ~shift13Bits) | (shift13Bits & ~shift15Bits);
    const shiftedResult = ((xorMaskedResult ^ shift12Bits ^ shift10Bits) << 31) >>> 0;

    return this.toSigned32bit(shiftedResult);
  }

  xorTransformArray(sourceIntegers: number[]): Uint8Array {
    const resultBytes = new Uint8Array(sourceIntegers.length);
    const keyBytes = Buffer.from(this.config.HEX_KEY, "hex");
    const keyLength = keyBytes.length;

    for (let index = 0; index < sourceIntegers.length; index += 1) {
      const value = sourceIntegers[index] ?? 0;
      if (index < keyLength) {
        const keyByte = keyBytes[index] ?? 0;
        resultBytes[index] = (value ^ keyByte) & 0xff;
      } else {
        resultBytes[index] = value & 0xff;
      }
    }

    return resultBytes;
  }
}
