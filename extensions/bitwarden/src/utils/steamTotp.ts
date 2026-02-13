import { createHmac } from "crypto";
import * as OTPAuth from "otpauth";

/** Steam Guard character set (avoids 0, 1, I, L, O, S, Z for readability). */
const STEAM_CHARS = "23456789BCDFGHJKMNPQRTVWXY";

const STEAM_PERIOD = 30;

export type SteamTotpGenerator = {
  generate: (timestamp?: number) => string;
  remaining: (timestamp?: number) => number;
  period: number;
};

/**
 * Creates a Steam Guard TOTP generator.
 * Steam uses HMAC-SHA1 with a custom 5-character output encoding.
 *
 * Implementation based on:
 * - Bitwarden SDK-internal: https://github.com/bitwarden/sdk-internal/blob/main/crates/bitwarden-vault/src/totp.rs
 * - Bitwarden browser extension steam:// format (see bitwarden.com/help/authenticator-keys/#steam-guard-totps)
 *
 * @param secretBase32 - Base32-encoded shared secret (from steam://SECRET or otpauth URI)
 */
export function createSteamTotpGenerator(secretBase32: string): SteamTotpGenerator {
  const secret = OTPAuth.Secret.fromBase32(secretBase32);
  const secretBuffer = Buffer.from(secret.bytes);

  return {
    generate(timestamp = Date.now()) {
      const time = Math.floor(timestamp / 1000);
      const buffer = Buffer.allocUnsafe(8);
      buffer.writeUInt32BE(0, 0);
      buffer.writeUInt32BE(Math.floor(time / STEAM_PERIOD), 4);

      const hmac = createHmac("sha1", secretBuffer).update(buffer).digest();
      const start = (hmac[19] ?? 0) & 0x0f;
      const truncated = hmac.subarray(start, start + 4);
      let fullCode = truncated.readUInt32BE(0) & 0x7fffffff;

      let code = "";
      for (let i = 0; i < 5; i++) {
        code += STEAM_CHARS.charAt(fullCode % STEAM_CHARS.length);
        fullCode = Math.floor(fullCode / STEAM_CHARS.length);
      }
      return code;
    },

    remaining(timestamp = Date.now()) {
      const elapsed = Math.floor(timestamp / 1000) % STEAM_PERIOD;
      return (STEAM_PERIOD - elapsed) * 1000;
    },

    period: STEAM_PERIOD,
  };
}
