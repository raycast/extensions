import { createGuardrails } from "@otplib/core";
import { generateSync } from "@otplib/totp";
import { parse } from "@otplib/uri";
import { base32 } from "@otplib/plugin-base32-scure";
import { crypto } from "@otplib/plugin-crypto-noble";
import { Err, Ok, Result, tryCatch } from "~/utils/errors";
import { captureException } from "~/utils/development";

/** Accept 10-byte (80-bit) secrets for Bitwarden/Google Authenticator compatibility. */
const guardrails = createGuardrails({ MIN_SECRET_BYTES: 10 });

/** Steam Guard character set (avoids 0, 1, I, L, O, S, Z for readability). */
const STEAM_CHARS = "23456789BCDFGHJKMNPQRTVWXY";
const STEAM_PERIOD = 30;

type HashAlgorithm = "sha1" | "sha256" | "sha512";

export type AuthenticatorOptions = {
  secret: string;
  period: number;
  algorithm: HashAlgorithm;
  digits: number;
};

export type TotpGenerator = {
  generate: (timestamp?: number) => string;
  remaining: (timestamp?: number) => number;
  period: number;
};

export type CreateTotpOptions =
  | { variant: "regular"; secret: string; period: number; algorithm: HashAlgorithm; digits: number }
  | { variant: "steam"; secret: string };

const steamHooks = {
  encodeToken(truncatedValue: number, digits: number): string {
    let code = "";
    let value = truncatedValue;
    for (let i = 0; i < digits; i++) {
      code += STEAM_CHARS[value % STEAM_CHARS.length];
      value = Math.floor(value / STEAM_CHARS.length);
    }
    return code;
  },
  validateToken(token: string, digits: number): void {
    if (token.length !== digits) {
      throw new Error(`Expected ${digits} characters, got ${token.length}`);
    }
    for (const ch of token) {
      if (!STEAM_CHARS.includes(ch)) {
        throw new Error(`Invalid character: ${ch}`);
      }
    }
  },
};

/**
 * Creates a TOTP generator for regular or Steam Guard keys.
 * Steam uses HMAC-SHA1 with a custom 5-character alphanumeric encoding.
 *
 * @see https://otplib.yeojz.dev/guide/hooks.html#steam-guard-encoding
 */
export function createTotpGenerator(opts: CreateTotpOptions): TotpGenerator {
  const getEpoch = (timestamp = Date.now()) => Math.floor(timestamp / 1000);
  const getRemaining = (period: number) => {
    return (timestamp?: number) => {
      const elapsed = getEpoch(timestamp) % period;
      return (period - elapsed) * 1000;
    };
  };

  if (opts.variant === "steam") {
    const { secret } = opts;

    return {
      period: STEAM_PERIOD,
      remaining: getRemaining(STEAM_PERIOD),
      generate: (timestamp?: number) => {
        return generateSync({
          secret,
          digits: 5,
          period: STEAM_PERIOD,
          crypto,
          base32,
          guardrails,
          hooks: steamHooks,
          ...(timestamp != null && { epoch: getEpoch(timestamp) }),
        });
      },
    };
  }

  const { secret, period, algorithm, digits } = opts;

  return {
    period,
    remaining: getRemaining(period),
    generate: (timestamp?: number) => {
      return generateSync({
        secret,
        period,
        digits,
        crypto,
        base32,
        guardrails,
        algorithm: algorithm.toLowerCase() as HashAlgorithm,
        ...(timestamp != null && { epoch: getEpoch(timestamp) }),
      });
    },
  };
}

export function parseTotp(totpString: string): AuthenticatorOptions {
  if (totpString.includes("otpauth")) {
    const [parsed, parseError] = tryCatch(() => parse(totpString));
    if (parseError) throw parseError;
    if (parsed.type !== "totp") throw new Error("Invalid authenticator key");

    const { secret, period = 30, algorithm = "sha1", digits = 6 } = parsed.params;
    return { secret, period, algorithm, digits };
  }

  return { secret: totpString, period: 30, algorithm: "sha1", digits: 6 };
}

export function getGenerator(totpString: string): Result<TotpGenerator> {
  let generatorOptions: CreateTotpOptions | undefined = undefined;

  if (totpString.startsWith("steam://")) {
    const secret = totpString.slice("steam://".length).trim();
    if (!secret) return Err(new Error("Invalid Steam Guard key"));

    generatorOptions = { variant: "steam", secret };
  } else {
    const [options, parseError] = tryCatch(() => parseTotp(totpString));
    if (parseError) {
      captureException("Failed to parse key", parseError);
      return Err(new Error("Failed to parse authenticator key"));
    }

    generatorOptions = { variant: "regular", ...options };
  }

  const [generator, error] = tryCatch(() => createTotpGenerator(generatorOptions));
  if (error) {
    captureException("Failed to initialize authenticator", error);
    return Err(new Error("Failed to initialize authenticator"));
  }

  return Ok(generator);
}
