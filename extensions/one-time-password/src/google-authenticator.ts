import protobuf from 'protobufjs';
import { environment } from '@raycast/api';
import { CreateAccount, CreateAccountSchema, describeAccountError, encodeBase32, summarizeImport } from './model';

type OtpParameter = {
  secret?: number[];
  name?: string;
  issuer?: string;
  algorithm?: number;
  digits?: number;
  type?: number;
};

type MigrationPayload = {
  otpParameters?: OtpParameter[];
  version?: number;
  batchSize?: number;
  batchIndex?: number;
};

export type SkippedMigrationAccount = { name: string; reason: string };

export type MigrationImport = {
  accounts: CreateAccount[];
  skipped: SkippedMigrationAccount[];
  batchIndex: number;
  batchSize: number;
};

const ALGORITHMS: Record<number, string> = { 0: 'SHA1', 1: 'SHA1', 2: 'SHA256', 3: 'SHA512' };
const DIGITS: Record<number, number> = { 0: 6, 1: 6, 2: 8 };
const MAX_BATCHES = 100;

function decodeData(input: string): Buffer {
  let data = input;
  if (input.startsWith('otpauth-migration:')) {
    const url = new URL(input);
    if (url.protocol !== 'otpauth-migration:' || url.hostname !== 'offline') throw new Error('Invalid migration URI');
    data = url.searchParams.get('data') || '';
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data) || data.length > 64 * 1024) throw new Error('Invalid migration data');
  const buffer = Buffer.from(data, 'base64');
  if (
    !buffer.length ||
    buffer.length > 48 * 1024 ||
    buffer.toString('base64').replace(/=+$/, '') !== data.replace(/=+$/, '')
  ) {
    throw new Error('Invalid migration data');
  }
  return buffer;
}

function unsupportedReason(item: OtpParameter): string | undefined {
  if (item.type === 1) return 'HOTP is not supported';
  if (item.type !== 2) return 'Unsupported account type';
  if (!ALGORITHMS[item.algorithm ?? 0]) return 'Unsupported algorithm';
  if (!DIGITS[item.digits ?? 0]) return 'Unsupported digit count';
  if (!item.secret?.length) return 'Missing secret key';
}

function displayName(item: OtpParameter): string {
  const name = item.name || 'Unnamed account';
  const shown =
    item.issuer && !name.toLowerCase().includes(item.issuer.toLowerCase()) ? `${item.issuer}: ${name}` : name;
  return shown.slice(0, 60);
}

// Google Authenticator often stores the label as "Service:username"; keep only the username when the service is known.
export function splitMigrationLabel(name = '', issuer = ''): { name: string; issuer?: string } {
  const colon = name.indexOf(':');
  const prefix = name.slice(0, colon).trim();
  const rest = name.slice(colon + 1).trim();
  if (colon > 0 && rest && prefix && (!issuer.trim() || prefix.toLowerCase() === issuer.trim().toLowerCase())) {
    return { name: rest, issuer: issuer.trim() || prefix };
  }
  return { name, issuer: issuer.trim() || undefined };
}

// Each QR code of a multi-QR export is an independent batch; unsupported accounts are skipped, not fatal.
export async function extractAccountsFromMigrationUrl(input: string): Promise<MigrationImport> {
  const root = await protobuf.load(`${environment.assetsPath}/google-authenticator-migration.proto`);
  const type = root.lookupType('MigrationPayload');
  const message = type.decode(decodeData(input));
  const payload = type.toObject(message, { bytes: Array, enums: Number }) as MigrationPayload;
  const batchSize = payload.batchSize ?? 1;
  const batchIndex = payload.batchIndex ?? 0;
  if (payload.version !== 1) throw new Error('Unsupported migration version');
  if (
    !Number.isInteger(batchSize) ||
    batchSize < 1 ||
    batchSize > MAX_BATCHES ||
    batchIndex < 0 ||
    batchIndex >= batchSize
  ) {
    throw new Error('Invalid migration batch');
  }
  if (!payload.otpParameters?.length || payload.otpParameters.length > 100) throw new Error('Invalid migration data');
  const accounts: CreateAccount[] = [];
  const skipped: SkippedMigrationAccount[] = [];
  for (const item of payload.otpParameters) {
    let reason = unsupportedReason(item);
    if (!reason) {
      try {
        accounts.push(
          CreateAccountSchema.parse({
            secret: encodeBase32(Uint8Array.from(item.secret!)),
            ...splitMigrationLabel(item.name, item.issuer),
            algorithm: ALGORITHMS[item.algorithm ?? 0],
            digits: DIGITS[item.digits ?? 0],
            period: 30,
          }),
        );
      } catch (error) {
        reason = describeAccountError(error);
      }
    }
    if (reason) skipped.push({ name: displayName(item), reason });
  }
  return { accounts, skipped, batchIndex, batchSize };
}

export function describeSkipped(skipped: SkippedMigrationAccount[], limit = 3): string {
  const items = skipped.slice(0, limit).map((item) => `${item.name} (${item.reason})`);
  if (skipped.length > limit) items.push(`+${skipped.length - limit} more`);
  return items.join(', ');
}

// Confirm dialog text before importing; pass the store result to get the success toast text instead.
export function describeMigrationImport(
  result: MigrationImport,
  imported?: { added: number; skipped: number },
): { title: string; message?: string } {
  const { accounts, skipped, batchIndex, batchSize } = result;
  const batch =
    batchSize > 1
      ? `Batch ${batchIndex + 1} of ${batchSize}${batchIndex + 1 < batchSize ? ' — scan the next QR code after this one.' : '.'}`
      : undefined;
  if (imported) {
    const title = summarizeImport({ added: imported.added, duplicates: imported.skipped, unsupported: skipped.length });
    return { title, message: batch };
  }
  return {
    title: `Import ${accounts.length} ${accounts.length === 1 ? 'Account' : 'Accounts'}?`,
    message: [
      'Existing accounts are kept. Exact duplicates are skipped.',
      skipped.length
        ? `${skipped.length} unsupported ${skipped.length === 1 ? 'account' : 'accounts'} will be skipped: ${describeSkipped(skipped)}.`
        : '',
      batch,
    ]
      .filter(Boolean)
      .join('\n\n'),
  };
}
