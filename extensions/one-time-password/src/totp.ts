import crypto from 'crypto';
import { Account, decodeBase32 } from './model';

export const TOKEN_TIME = 30;

export function generateToken(
  accountOrSecret: Pick<Account, 'secret' | 'algorithm' | 'digits' | 'period'> | string,
  timestamp = Date.now(),
): string {
  const account =
    typeof accountOrSecret === 'string'
      ? { secret: accountOrSecret, algorithm: 'SHA1', digits: 6, period: TOKEN_TIME }
      : accountOrSecret;
  if (!Number.isFinite(timestamp) || timestamp < 0) throw new Error('Invalid timestamp');
  if (
    !['SHA1', 'SHA256', 'SHA512'].includes(account.algorithm) ||
    !Number.isInteger(account.digits) ||
    account.digits < 6 ||
    account.digits > 8 ||
    !Number.isInteger(account.period) ||
    account.period < 1 ||
    account.period > 300
  ) {
    throw new Error('Invalid OTP settings');
  }
  const counter = Math.floor(timestamp / (account.period * 1000));
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = crypto
    .createHmac(account.algorithm.toLowerCase(), decodeBase32(account.secret))
    .update(message)
    .digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 10 ** account.digits;
  return String(code).padStart(account.digits, '0');
}

// 6 digits read as 123 456; 7 and 8 digits as 1234 567 and 1234 5678.
export function formatCode(code: string): string {
  return code.length > 6 ? `${code.slice(0, 4)} ${code.slice(4)}` : code.replace(/(.{3})(?=.)/g, '$1 ');
}
