import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import protobuf from 'protobufjs';
import { encodeBase32 } from '../src/model';

const assetsPath = path.resolve(__dirname, '../assets');
const moduleLoader = require('node:module') as { _load: (name: string, parent?: unknown, isMain?: boolean) => unknown };
const originalLoad = moduleLoader._load;
moduleLoader._load = function (name, parent, isMain) {
  if (name === '@raycast/api') return { environment: { assetsPath } };
  return originalLoad.call(this, name, parent, isMain);
};
const ga = require('../src/google-authenticator') as typeof import('../src/google-authenticator');
moduleLoader._load = originalLoad;

const type = protobuf
  .loadSync(path.join(assetsPath, 'google-authenticator-migration.proto'))
  .lookupType('MigrationPayload');
const raw = Buffer.from('12345678901234567890');
const secret = encodeBase32(raw);

type Item = { secret?: Buffer; name?: string; issuer?: string; algorithm?: number; digits?: number; type?: number };
const totp = (name: string, extra: Item = {}): Item => ({
  secret: raw,
  name,
  issuer: 'Example',
  algorithm: 1,
  digits: 1,
  type: 2,
  ...extra,
});
function payload(otpParameters: Item[], extra: Record<string, number> = {}): string {
  return Buffer.from(type.encode(type.create({ otpParameters, version: 1, batchId: 7, ...extra })).finish()).toString(
    'base64',
  );
}

test('single and multi-batch exports are accepted from a URI or raw data', async () => {
  const single = await ga.extractAccountsFromMigrationUrl(payload([totp('alice')]));
  assert.deepEqual([single.batchIndex, single.batchSize, single.skipped], [0, 1, []]);
  assert.deepEqual(single.accounts, [
    {
      secret,
      name: 'alice',
      issuer: 'Example',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      favorite: false,
      useCount: 0,
    },
  ]);
  const data = payload([totp('bob', { algorithm: 3, digits: 2 }), totp('carol', { issuer: '' })], {
    batchSize: 3,
    batchIndex: 2,
  });
  for (const input of [data, `otpauth-migration://offline?data=${encodeURIComponent(data)}`]) {
    const result = await ga.extractAccountsFromMigrationUrl(input);
    assert.deepEqual([result.batchIndex, result.batchSize, result.skipped.length], [2, 3, 0]);
    assert.deepEqual(
      result.accounts.map((account) => [
        (account as { name: string }).name,
        (account as { algorithm: string }).algorithm,
        (account as { digits: number }).digits,
      ]),
      [
        ['bob', 'SHA512', 8],
        ['carol', 'SHA1', 6],
      ],
    );
  }
});

test('unsupported accounts are skipped with reasons instead of rejecting the batch', async () => {
  const result = await ga.extractAccountsFromMigrationUrl(
    payload([
      totp('alice'),
      totp('hotp-account', { type: 1 }),
      totp('md5-account', { algorithm: 4 }),
      totp('no-secret', { secret: Buffer.alloc(0) }),
      totp('', { issuer: 'Nameless' }),
      totp('bad-digits', { digits: 3 }),
    ]),
  );
  assert.equal(result.accounts.length, 1);
  assert.deepEqual(result.skipped, [
    { name: 'Example: hotp-account', reason: 'HOTP is not supported' },
    { name: 'Example: md5-account', reason: 'Unsupported algorithm' },
    { name: 'Example: no-secret', reason: 'Missing secret key' },
    { name: 'Nameless: Unnamed account', reason: 'Missing account name' },
    { name: 'Example: bad-digits', reason: 'Unsupported digit count' },
  ]);
  const onlyHotp = await ga.extractAccountsFromMigrationUrl(payload([totp('h', { type: 1 })]));
  assert.deepEqual([onlyHotp.accounts.length, onlyHotp.skipped.length], [0, 1]);
});

test('invalid payloads still throw', async () => {
  const bad = (otpParameters: Item[], extra: Record<string, number>) =>
    ga.extractAccountsFromMigrationUrl(payload(otpParameters, extra));
  await assert.rejects(bad([totp('a')], { batchSize: 2, batchIndex: 2 }), /Invalid migration batch/);
  await assert.rejects(bad([totp('a')], { batchSize: 2, batchIndex: -1 }), /Invalid migration batch/);
  await assert.rejects(bad([totp('a')], { batchSize: 101 }), /Invalid migration batch/);
  await assert.rejects(bad([totp('a')], { version: 2 }), /Unsupported migration version/);
  await assert.rejects(bad([], {}), /Invalid migration data/);
  await assert.rejects(ga.extractAccountsFromMigrationUrl('not base64!'), /Invalid migration data/);
  await assert.rejects(
    ga.extractAccountsFromMigrationUrl('otpauth-migration://other?data=AAAA'),
    /Invalid migration URI/,
  );
  await assert.rejects(ga.extractAccountsFromMigrationUrl('otpauth-migration://offline'), /Invalid migration data/);
});

test('migration messages cover skipped accounts, batches and counts', async () => {
  const batch = await ga.extractAccountsFromMigrationUrl(
    payload(
      [
        totp('a'),
        totp('b'),
        totp('h1', { type: 1 }),
        totp('h2', { type: 1 }),
        totp('h3', { type: 1 }),
        totp('h4', { type: 1 }),
      ],
      { batchSize: 3, batchIndex: 1 },
    ),
  );
  const confirm = ga.describeMigrationImport(batch);
  assert.equal(confirm.title, 'Import 2 Accounts?');
  assert.match(
    confirm.message ?? '',
    /4 unsupported accounts will be skipped: Example: h1 \(HOTP is not supported\), .*, \+1 more\./,
  );
  assert.match(confirm.message ?? '', /Batch 2 of 3 — scan the next QR code after this one\./);
  assert.deepEqual(ga.describeMigrationImport(batch, { added: 1, skipped: 1 }), {
    title: '1 added · 1 duplicate skipped · 4 unsupported skipped',
    message: 'Batch 2 of 3 — scan the next QR code after this one.',
  });
  const last = await ga.extractAccountsFromMigrationUrl(payload([totp('a')], { batchSize: 3, batchIndex: 2 }));
  assert.equal(ga.describeMigrationImport(last).message?.endsWith('Batch 3 of 3.'), true);
  const single = await ga.extractAccountsFromMigrationUrl(payload([totp('a')]));
  assert.equal(ga.describeMigrationImport(single).title, 'Import 1 Account?');
  assert.doesNotMatch(ga.describeMigrationImport(single).message ?? '', /Batch|unsupported/);
  assert.deepEqual(ga.describeMigrationImport(single, { added: 1, skipped: 0 }), {
    title: '1 added',
    message: undefined,
  });
  assert.equal(ga.describeSkipped([]), '');
});

test('Google Authenticator "Service:username" labels keep only the username', () => {
  assert.deepEqual(ga.splitMigrationLabel('GitHub:alice', 'GitHub'), { name: 'alice', issuer: 'GitHub' });
  assert.deepEqual(ga.splitMigrationLabel('github: alice', 'GitHub'), { name: 'alice', issuer: 'GitHub' });
  assert.deepEqual(ga.splitMigrationLabel('GitHub:alice', ''), { name: 'alice', issuer: 'GitHub' });
  assert.deepEqual(ga.splitMigrationLabel('Work:alice', 'GitHub'), { name: 'Work:alice', issuer: 'GitHub' });
  assert.deepEqual(ga.splitMigrationLabel('alice', ''), { name: 'alice', issuer: undefined });
});
