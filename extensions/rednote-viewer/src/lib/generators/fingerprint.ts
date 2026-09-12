import crypto from "node:crypto";
import { CryptoConfig } from "../config/config.js";
import * as FPData from "../data/fingerprintData.js";
import {
  choiceWithWeights,
  getRendererInfo,
  getScreenConfig,
  generateCanvasHash,
  generateWebglHash,
  colorDepth,
  deviceMemory,
  coreCount,
} from "./fingerprintHelpers.js";
import { Base64Encoder } from "../utils/encoder.js";

function rc4(key: Buffer, data: Buffer): Buffer {
  const s = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) s[i] = i;

  let j = 0;
  for (let i = 0; i < 256; i += 1) {
    const keyByte = key[i % key.length] ?? 0;
    j = (j + (s[i] ?? 0) + keyByte) & 0xff;
    const si = s[i] ?? 0;
    const sj = s[j] ?? 0;
    s[i] = sj;
    s[j] = si;
  }

  const output = Buffer.alloc(data.length);
  let i = 0;
  j = 0;
  for (let k = 0; k < data.length; k += 1) {
    i = (i + 1) & 0xff;
    j = (j + (s[i] ?? 0)) & 0xff;
    const si = s[i] ?? 0;
    const sj = s[j] ?? 0;
    s[i] = sj;
    s[j] = si;
    const rnd = s[((s[i] ?? 0) + (s[j] ?? 0)) & 0xff] ?? 0;
    const dataByte = data[k] ?? 0;
    output[k] = dataByte ^ rnd;
  }

  return output;
}

export class FingerprintGenerator {
  private readonly config: CryptoConfig;
  private readonly encoder: Base64Encoder;
  private readonly b1Key: Buffer;

  constructor(config: CryptoConfig) {
    this.config = config;
    this.encoder = new Base64Encoder(this.config);
    this.b1Key = Buffer.from(this.config.B1_SECRET_KEY, "utf8");
  }

  generateB1(fp: Record<string, unknown>): string {
    const b1Fp: Record<string, unknown> = {
      x33: fp["x33"],
      x34: fp["x34"],
      x35: fp["x35"],
      x36: fp["x36"],
      x37: fp["x37"],
      x38: fp["x38"],
      x39: fp["x39"],
      x42: fp["x42"],
      x43: fp["x43"],
      x44: fp["x44"],
      x45: fp["x45"],
      x46: fp["x46"],
      x48: fp["x48"],
      x49: fp["x49"],
      x50: fp["x50"],
      x51: fp["x51"],
      x52: fp["x52"],
      x82: fp["x82"],
    };

    const b1Json = JSON.stringify(b1Fp);
    const cipherBytes = rc4(this.b1Key, Buffer.from(b1Json, "utf8"));
    const latin1 = cipherBytes.toString("latin1");
    const encodedUrl = encodeURIComponent(latin1);

    const b: number[] = [];
    for (const segment of encodedUrl.split("%").slice(1)) {
      const chars = [...segment];
      b.push(parseInt(chars.slice(0, 2).join(""), 16));
      for (const ch of chars.slice(2)) {
        b.push(ch.charCodeAt(0));
      }
    }

    return this.encoder.encode(b);
  }

  generate(cookies: Record<string, unknown>, userAgent: string): Record<string, unknown> {
    const cookieString = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");

    const screenConfig = getScreenConfig();
    const isIncognitoMode = choiceWithWeights(["true", "false"], [0.95, 0.05]);
    const [vendor, renderer] = getRendererInfo();

    const x78Y = Math.floor(Math.random() * (2450 - 2350 + 1)) + 2350;

    const fp: Record<string, unknown> = {
      x1: userAgent,
      x2: "false",
      x3: "zh-CN",
      x4: `${colorDepth()}`,
      x5: `${deviceMemory()}`,
      x6: "24",
      x7: `${vendor},${renderer}`,
      x8: `${coreCount()}`,
      x9: `${screenConfig.width};${screenConfig.height}`,
      x10: `${screenConfig.availWidth};${screenConfig.availHeight}`,
      x11: "-480",
      x12: "Asia/Shanghai",
      x13: isIncognitoMode,
      x14: isIncognitoMode,
      x15: isIncognitoMode,
      x16: "false",
      x17: "false",
      x18: "un",
      x19: "Win32",
      x20: "",
      x21: FPData.BROWSER_PLUGINS,
      x22: generateWebglHash(),
      x23: "false",
      x24: "false",
      x25: "false",
      x26: "false",
      x27: "false",
      x28: "0,false,false",
      x29: "4,7,8",
      x30: "swf object not loaded",
      x33: "0",
      x34: "0",
      x35: "0",
      x36: `${Math.floor(Math.random() * 20) + 1}`,
      x37: "0|0|0|0|0|0|0|0|0|1|0|0|0|0|0|0|0|0|1|0|0|0|0|0",
      x38: "0|0|1|0|1|0|0|0|0|0|1|0|1|0|1|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0",
      x39: 0,
      x40: "0",
      x41: "0",
      x42: "3.4.4",
      x43: generateCanvasHash(),
      x44: `${Date.now()}`,
      x45: "__SEC_CAV__1-1-1-1-1|__SEC_WSA__|",
      x46: "false",
      x47: "1|0|0|0|0|0",
      x48: "",
      x49: "{list:[],type:}",
      x50: "",
      x51: "",
      x52: "",
      x55: "380,380,360,400,380,400,420,380,400,400,360,360,440,420",
      x56: `${vendor}|${renderer}|${generateWebglHash()}|35`,
      x57: cookieString,
      x58: "180",
      x59: "2",
      x60: "63",
      x61: "1291",
      x62: "2047",
      x63: "0",
      x64: "0",
      x65: "0",
      x66: {
        referer: "",
        location: "https://www.xiaohongshu.com/explore",
        frame: 0,
      },
      x67: "1|0",
      x68: "0",
      x69: "326|1292|30",
      x70: ["location"],
      x71: "true",
      x72: "complete",
      x73: "1191",
      x74: "0|0|0",
      x75: "Google Inc.",
      x76: "true",
      x77: "1|1|1|1|1|1|1|1|1|1",
      x78: {
        x: 0,
        y: x78Y,
        left: 0,
        right: 290.828125,
        bottom: x78Y + 18,
        height: 18,
        top: x78Y,
        width: 290.828125,
        font: FPData.FONTS,
      },
      x82: "_0x17a2|_0x1954",
      x31: "124.04347527516074",
      x79: "144|599565058866",
      x53: crypto.createHash("md5").update(crypto.randomBytes(32)).digest("hex"),
      x54: FPData.VOICE_HASH_OPTIONS,
      x80: "1|[object FileSystemDirectoryHandle]",
    };

    return fp;
  }

  update(fp: Record<string, unknown>, cookies: Record<string, unknown>, url: string): void {
    const cookieString = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");

    Object.assign(fp, {
      x39: 0,
      x44: `${Date.now()}`,
      x57: cookieString,
      x66: {
        referer: "https://www.xiaohongshu.com/explore",
        location: url,
        frame: 0,
      },
    });
  }
}
