import { CryptoConfig } from "../config/config.js";

export class HexProcessor {
  private readonly config: CryptoConfig;

  constructor(config: CryptoConfig) {
    this.config = config;
  }

  hexStringToBytes(hexString: string): number[] {
    const values: number[] = [];
    for (let i = 0; i < hexString.length; i += this.config.HEX_CHUNK_SIZE) {
      const chunk = hexString.slice(i, i + this.config.HEX_CHUNK_SIZE);
      values.push(parseInt(chunk, 16));
    }
    return values;
  }

  processHexParameter(hexString: string, xorKey: number): number[] {
    if (hexString.length !== this.config.EXPECTED_HEX_LENGTH) {
      throw new Error(`hex parameter must be ${this.config.EXPECTED_HEX_LENGTH} characters`);
    }

    const bytes = this.hexStringToBytes(hexString);
    return bytes.map((val) => (val ^ xorKey) & 0xff).slice(0, this.config.OUTPUT_BYTE_COUNT);
  }
}
