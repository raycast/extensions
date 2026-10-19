import crypto from 'crypto';
import { z } from 'zod';
import { Account } from './model';

const MAX_BACKUP_BYTES = 1024 * 1024;
const MAX_ACCOUNTS = 1000;
const KDF = { name: 'scrypt', N: 16384, r: 8, p: 1 } as const;
const FORMAT = 'raycast-one-time-password';

const Base64 = z
  .string()
  .regex(/^[A-Za-z0-9+/]+={0,2}$/)
  .max(MAX_BACKUP_BYTES);
const Envelope = z
  .object({
    format: z.literal(FORMAT),
    version: z.literal(1),
    kdf: z
      .object({
        name: z.literal(KDF.name),
        N: z.literal(KDF.N),
        r: z.literal(KDF.r),
        p: z.literal(KDF.p),
        salt: Base64,
      })
      .strict(),
    cipher: z.object({ name: z.literal('aes-256-gcm'), nonce: Base64, tag: Base64 }).strict(),
    data: Base64,
  })
  .strict();

function validatePassword(password: string): void {
  if (typeof password !== 'string' || password.length < 1 || password.length > 1024) {
    throw new Error('Invalid backup password');
  }
}

function decodeFixed(value: string, bytes: number): Buffer {
  const decoded = Buffer.from(value, 'base64');
  if (decoded.length !== bytes || decoded.toString('base64') !== value) throw new Error('Invalid backup');
  return decoded;
}

function header(salt: string, nonce: string): Buffer {
  return Buffer.from(`${FORMAT}:1:${KDF.name}:${KDF.N}:${KDF.r}:${KDF.p}:${salt}:${nonce}`, 'utf8');
}

async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 32, { N: KDF.N, r: KDF.r, p: KDF.p, maxmem: 32 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function encodeBackup(accounts: Account[], password: string): Promise<string> {
  validatePassword(password);
  if (!Array.isArray(accounts) || accounts.length > MAX_ACCOUNTS) throw new Error('Invalid accounts');
  const validated = Account.array().parse(accounts);
  const plaintext = Buffer.from(JSON.stringify({ version: 1, accounts: validated }), 'utf8');
  if (plaintext.length > MAX_BACKUP_BYTES / 2) throw new Error('Backup is too large');
  const salt = crypto.randomBytes(16);
  const nonce = crypto.randomBytes(12);
  const saltText = salt.toString('base64');
  const nonceText = nonce.toString('base64');
  const key = await deriveKey(password, salt);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(header(saltText, nonceText));
  const data = Buffer.concat([cipher.update(plaintext), cipher.final()]).toString('base64');
  return JSON.stringify({
    format: FORMAT,
    version: 1,
    kdf: { ...KDF, salt: saltText },
    cipher: { name: 'aes-256-gcm', nonce: nonceText, tag: cipher.getAuthTag().toString('base64') },
    data,
  });
}

export async function decodeBackup(text: string, password: string): Promise<Account[]> {
  validatePassword(password);
  if (typeof text !== 'string' || Buffer.byteLength(text, 'utf8') > MAX_BACKUP_BYTES)
    throw new Error('Backup is too large');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid backup');
  }
  const envelope = Envelope.parse(parsed);
  const salt = decodeFixed(envelope.kdf.salt, 16);
  const nonce = decodeFixed(envelope.cipher.nonce, 12);
  const tag = decodeFixed(envelope.cipher.tag, 16);
  const ciphertext = Buffer.from(envelope.data, 'base64');
  if (ciphertext.length > MAX_BACKUP_BYTES / 2 || ciphertext.toString('base64') !== envelope.data)
    throw new Error('Invalid backup');
  const key = await deriveKey(password, salt);
  let plaintext: Buffer;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
    decipher.setAAD(header(envelope.kdf.salt, envelope.cipher.nonce));
    decipher.setAuthTag(tag);
    plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new Error('Incorrect password or damaged backup');
  }
  let payload: unknown;
  try {
    payload = JSON.parse(plaintext.toString('utf8'));
  } catch {
    throw new Error('Invalid backup content');
  }
  const data = z
    .object({ version: z.literal(1), accounts: Account.array().max(MAX_ACCOUNTS) })
    .strict()
    .parse(payload);
  return data.accounts;
}

// Maps decodeBackup failures to messages that are safe to show; undefined means the error is unexpected.
export function describeBackupError(error: unknown): string | undefined {
  if (error instanceof z.ZodError) return 'Not a valid OTP backup file. Check the selected format.';
  if (!(error instanceof Error)) return undefined;
  return new Map([
    ['Invalid backup password', 'Enter the backup password.'],
    ['Incorrect password or damaged backup', 'Incorrect password, or the backup file is damaged.'],
    ['Backup is too large', 'Backup is too large.'],
    ['Invalid backup', 'Not a valid OTP backup file. Check the selected format.'],
    ['Invalid backup content', 'Not a valid OTP backup file. Check the selected format.'],
  ]).get(error.message);
}
