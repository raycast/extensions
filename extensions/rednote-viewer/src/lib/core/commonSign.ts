import { CryptoConfig } from "../config/config.js";
import { FingerprintGenerator } from "../generators/fingerprint.js";
import { CRC32 } from "./crc32Encrypt.js";
import { Base64Encoder } from "../utils/encoder.js";

export class XsCommonSigner {
  private readonly config: CryptoConfig;
  private readonly fpGenerator: FingerprintGenerator;
  private readonly encoder: Base64Encoder;

  constructor(config: CryptoConfig | null = null) {
    this.config = config ?? new CryptoConfig();
    this.fpGenerator = new FingerprintGenerator(this.config);
    this.encoder = new Base64Encoder(this.config);
  }

  sign(cookieDict: Record<string, unknown>): string {
    const a1Value = cookieDict["a1"];
    if (typeof a1Value !== "string") {
      throw new Error("a1 cookie is required");
    }

    const fingerprint = this.fpGenerator.generate(cookieDict, this.config.PUBLIC_USERAGENT);
    const b1 = this.fpGenerator.generateB1(fingerprint);
    const x9 = CRC32.crc32JsInt(b1);

    const signStruct = {
      ...this.config.SIGNATURE_XSCOMMON_TEMPLATE,
      x5: a1Value,
      x8: b1,
      x9,
    };

    const signJson = JSON.stringify(signStruct);
    return this.encoder.encode(signJson);
  }
}
