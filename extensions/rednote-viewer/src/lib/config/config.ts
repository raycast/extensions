export class CryptoConfig {
  readonly DES_KEY: string;
  readonly GID_URL: string;
  readonly DATA_PALTFORM: string;
  readonly DATA_SVN: string;
  readonly DATA_SDK_VERSION: string;
  readonly DATA_webBuild: string;

  readonly MAX_32BIT: number;
  readonly MAX_SIGNED_32BIT: number;
  readonly MAX_BYTE: number;

  readonly STANDARD_BASE64_ALPHABET: string;
  readonly CUSTOM_BASE64_ALPHABET: string;
  readonly X3_BASE64_ALPHABET: string;

  readonly HEX_KEY: string;
  readonly EXPECTED_HEX_LENGTH: number;
  readonly OUTPUT_BYTE_COUNT: number;
  readonly HEX_CHUNK_SIZE: number;

  readonly VERSION_BYTES: number[];

  readonly SEQUENCE_VALUE_MIN: number;
  readonly SEQUENCE_VALUE_MAX: number;
  readonly WINDOW_PROPS_LENGTH_MIN: number;
  readonly WINDOW_PROPS_LENGTH_MAX: number;

  readonly CHECKSUM_VERSION: number;
  readonly CHECKSUM_XOR_KEY: number;
  readonly CHECKSUM_FIXED_TAIL: number[];

  readonly ENV_FINGERPRINT_XOR_KEY: number;
  readonly ENV_FINGERPRINT_TIME_OFFSET_MIN: number;
  readonly ENV_FINGERPRINT_TIME_OFFSET_MAX: number;

  readonly SIGNATURE_DATA_TEMPLATE: Record<string, string>;

  readonly X3_PREFIX: string;
  readonly XYS_PREFIX: string;

  readonly HEX_CHARS: string;
  readonly XRAY_TRACE_ID_SEQ_MAX: number;
  readonly XRAY_TRACE_ID_TIMESTAMP_SHIFT: number;
  readonly XRAY_TRACE_ID_PART1_LENGTH: number;
  readonly XRAY_TRACE_ID_PART2_LENGTH: number;
  readonly B3_TRACE_ID_LENGTH: number;

  readonly B1_SECRET_KEY: string;

  readonly RANDOM_SEED?: number | bigint | readonly number[] | Uint32Array;

  readonly SIGNATURE_XSCOMMON_TEMPLATE: Record<string, unknown>;

  readonly PUBLIC_USERAGENT: string;

  constructor(overrides: Partial<CryptoConfig> = {}) {
    this.DES_KEY = overrides.DES_KEY ?? "zbp30y86";
    this.GID_URL = overrides.GID_URL ?? "https://as.xiaohongshu.com/api/sec/v1/shield/webprofile";
    this.DATA_PALTFORM = overrides.DATA_PALTFORM ?? "Windows";
    this.DATA_SVN = overrides.DATA_SVN ?? "2";
    this.DATA_SDK_VERSION = overrides.DATA_SDK_VERSION ?? "4.2.6";
    this.DATA_webBuild = overrides.DATA_webBuild ?? "5.0.3";

    this.MAX_32BIT = overrides.MAX_32BIT ?? 0xffffffff;
    this.MAX_SIGNED_32BIT = overrides.MAX_SIGNED_32BIT ?? 0x7fffffff;
    this.MAX_BYTE = overrides.MAX_BYTE ?? 255;

    this.STANDARD_BASE64_ALPHABET =
      overrides.STANDARD_BASE64_ALPHABET ?? "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    this.CUSTOM_BASE64_ALPHABET =
      overrides.CUSTOM_BASE64_ALPHABET ?? "ZmserbBoHQtNP+wOcza/LpngG8yJq42KWYj0DSfdikx3VT16IlUAFM97hECvuRX5";
    this.X3_BASE64_ALPHABET =
      overrides.X3_BASE64_ALPHABET ?? "MfgqrsbcyzPQRStuvC7mn501HIJBo2DEFTKdeNOwxWXYZap89+/A4UVLhijkl63G";

    this.HEX_KEY =
      overrides.HEX_KEY ??
      "71a302257793271ddd273bcee3e4b98d9d7935e1da33f5765e2ea8afb6dc77a51a499d23b67c20660025860cbf13d4540d92497f58686c574e508f46e1956344f39139bf4faf22a3eef120b79258145b2feb5193b6478669961298e79bedca646e1a693a926154a5a7a1bd1cf0dedb742f917a747a1e388b234f2277";

    this.EXPECTED_HEX_LENGTH = overrides.EXPECTED_HEX_LENGTH ?? 32;
    this.OUTPUT_BYTE_COUNT = overrides.OUTPUT_BYTE_COUNT ?? 8;
    this.HEX_CHUNK_SIZE = overrides.HEX_CHUNK_SIZE ?? 2;

    this.VERSION_BYTES = overrides.VERSION_BYTES ? [...overrides.VERSION_BYTES] : [119, 104, 96, 41];

    this.SEQUENCE_VALUE_MIN = overrides.SEQUENCE_VALUE_MIN ?? 15;
    this.SEQUENCE_VALUE_MAX = overrides.SEQUENCE_VALUE_MAX ?? 50;
    this.WINDOW_PROPS_LENGTH_MIN = overrides.WINDOW_PROPS_LENGTH_MIN ?? 900;
    this.WINDOW_PROPS_LENGTH_MAX = overrides.WINDOW_PROPS_LENGTH_MAX ?? 1200;

    this.CHECKSUM_VERSION = overrides.CHECKSUM_VERSION ?? 1;
    this.CHECKSUM_XOR_KEY = overrides.CHECKSUM_XOR_KEY ?? 115;
    this.CHECKSUM_FIXED_TAIL = overrides.CHECKSUM_FIXED_TAIL
      ? [...overrides.CHECKSUM_FIXED_TAIL]
      : [249, 65, 103, 103, 201, 181, 131, 99, 94, 7, 68, 250, 132, 21];

    this.ENV_FINGERPRINT_XOR_KEY = overrides.ENV_FINGERPRINT_XOR_KEY ?? 41;
    this.ENV_FINGERPRINT_TIME_OFFSET_MIN = overrides.ENV_FINGERPRINT_TIME_OFFSET_MIN ?? 10;
    this.ENV_FINGERPRINT_TIME_OFFSET_MAX = overrides.ENV_FINGERPRINT_TIME_OFFSET_MAX ?? 50;

    this.SIGNATURE_DATA_TEMPLATE = overrides.SIGNATURE_DATA_TEMPLATE
      ? { ...overrides.SIGNATURE_DATA_TEMPLATE }
      : {
          x0: "4.2.6",
          x1: "xhs-pc-web",
          x2: "Windows",
          x3: "",
          x4: "",
        };

    this.X3_PREFIX = overrides.X3_PREFIX ?? "mns0301_";
    this.XYS_PREFIX = overrides.XYS_PREFIX ?? "XYS_";

    this.HEX_CHARS = overrides.HEX_CHARS ?? "abcdef0123456789";
    this.XRAY_TRACE_ID_SEQ_MAX = overrides.XRAY_TRACE_ID_SEQ_MAX ?? 8388607;
    this.XRAY_TRACE_ID_TIMESTAMP_SHIFT = overrides.XRAY_TRACE_ID_TIMESTAMP_SHIFT ?? 23;
    this.XRAY_TRACE_ID_PART1_LENGTH = overrides.XRAY_TRACE_ID_PART1_LENGTH ?? 16;
    this.XRAY_TRACE_ID_PART2_LENGTH = overrides.XRAY_TRACE_ID_PART2_LENGTH ?? 16;
    this.B3_TRACE_ID_LENGTH = overrides.B3_TRACE_ID_LENGTH ?? 16;

    this.B1_SECRET_KEY = overrides.B1_SECRET_KEY ?? "xhswebmplfbt";

    this.RANDOM_SEED = overrides.RANDOM_SEED;

    this.SIGNATURE_XSCOMMON_TEMPLATE = overrides.SIGNATURE_XSCOMMON_TEMPLATE
      ? { ...overrides.SIGNATURE_XSCOMMON_TEMPLATE }
      : {
          s0: 5,
          s1: "",
          x0: "1",
          x1: "4.2.6",
          x2: "Windows",
          x3: "xhs-pc-web",
          x4: "4.86.0",
          x5: "",
          x6: "",
          x7: "",
          x8: "",
          x9: -596800761,
          x10: 0,
          x11: "normal",
        };

    this.PUBLIC_USERAGENT =
      overrides.PUBLIC_USERAGENT ??
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0";
  }

  withOverrides(overrides: Partial<CryptoConfig>): CryptoConfig {
    return new CryptoConfig({ ...this, ...overrides });
  }
}

export type CryptoConfigInit = Partial<CryptoConfig>;
