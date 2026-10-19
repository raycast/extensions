import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Account, CreateAccountSchema, RECENT_LIMIT, accountLabel, describeAccountError, describeInvalidLines, encodeBase32, exportOtpAuthUri, findBestAccount, groupAccounts, moveId, parseOtpAuthUri, parseOtpAuthUriList, reorderAccounts, summarizeImport } from '../src/model';
import { formatCode, generateToken } from '../src/totp';
import { decodeBackup, describeBackupError, encodeBackup } from '../src/backup';

const secret = encodeBase32(Buffer.from('12345678901234567890'));

test('portable exports preserve labels and settings; ambiguous labels require encrypted backup', () => {
  for (const input of [
    { id: 'a', name: 'alice@example.com', secret },
    { id: 'b', name: 'alice:work', issuer: 'Example', secret, algorithm: 'SHA512', digits: 8, period: 60 },
  ]) {
    const account = Account.parse(input);
    const parsed = parseOtpAuthUri(exportOtpAuthUri(account));
    assert.deepEqual([parsed.name, parsed.issuer, parsed.secret, parsed.algorithm, parsed.digits, parsed.period], [account.name, account.issuer, account.secret, account.algorithm, account.digits, account.period]);
  }
  assert.throws(() => exportOtpAuthUri(Account.parse({ id: 'a', name: 'alice:work', secret })));
  assert.throws(() => exportOtpAuthUri(Account.parse({ id: 'a', name: 'alice', issuer: 'Issuer:Colon', secret })));
  assert.equal(parseOtpAuthUri(`otpauth://totp/Alice?secret=${secret}&image=https%3A%2F%2Fexample.com%2Ficon.png`).name, 'Alice');
  assert.equal(Account.parse({ id: 'legacy', name: 'Alice', secret, issuer: '' }).issuer, undefined);
});

test('RFC 6238 SHA1, SHA256 and SHA512 8-digit vectors', () => {
  const vectors = [
    ['SHA1', '12345678901234567890', ['94287082', '07081804', '14050471', '89005924', '69279037', '65353130']],
    ['SHA256', '12345678901234567890123456789012', ['46119246', '68084774', '67062674', '91819424', '90698825', '77737706']],
    ['SHA512', '1234567890123456789012345678901234567890123456789012345678901234', ['90693936', '25091201', '99943326', '93441116', '38618901', '47863826']],
  ] as const;
  for (const [algorithm, raw, expected] of vectors) {
    const timestamps = [59, 1111111109, 1111111111, 1234567890, 2000000000, 20000000000];
    for (let index = 0; index < timestamps.length; index++) {
      assert.equal(generateToken({ secret: encodeBase32(Buffer.from(raw)), algorithm, digits: 8, period: 30 }, timestamps[index] * 1000), expected[index]);
    }
  }
});

test('six and seven digits and period boundaries', () => {
  assert.equal(generateToken(secret, 0), '755224');
  assert.equal(generateToken(secret, 29_999), '755224');
  assert.equal(generateToken(secret, 30_000), '287082');
  assert.equal(generateToken({ secret, algorithm: 'SHA1', digits: 7, period: 30 }, 30_000), '4287082');
  assert.equal(generateToken({ secret, algorithm: 'SHA1', digits: 6, period: 60 }, 30_000), '755224');
});

test('legacy account defaults and strict Base32', () => {
  const account = Account.parse({ id: 'old', name: 'Legacy', secret });
  assert.deepEqual([account.algorithm, account.digits, account.period, account.favorite, account.useCount], ['SHA1', 6, 30, false, 0]);
  assert.throws(() => Account.parse({ id: 'x', name: 'Bad', secret: 'ABC1' }));
  assert.throws(() => Account.parse({ id: 'x', name: 'Bad', secret: 'MZ' }));
  assert.throws(() => Account.parse({ id: 'x', name: 'Bad', secret, period: 0 }));
  assert.throws(() => Account.parse({ id: 'x', name: 'Bad', secret, digits: 9 }));
});

test('TOTP URI labels, settings and unsupported parameters', () => {
  const uri = `otpauth://totp/Example:alice%40example.com?secret=${secret}&issuer=Example&algorithm=SHA256&digits=8&period=45`;
  assert.deepEqual(parseOtpAuthUri(uri), {
    name: 'alice@example.com', issuer: 'Example', secret, algorithm: 'SHA256', digits: 8, period: 45, favorite: false, useCount: 0,
  });
  assert.throws(() => parseOtpAuthUri(uri.replace('totp/', 'hotp/')));
  assert.throws(() => parseOtpAuthUri(`${uri}&digits=6`));
  assert.throws(() => parseOtpAuthUri(`${uri}&counter=1`));
  assert.throws(() => parseOtpAuthUri(uri.replace('issuer=Example', 'issuer=Other')));
});

test('encrypted backup roundtrip, fresh randomness, wrong password and tampering', async () => {
  const account = Account.parse({ id: 'test-id', name: 'Example', issuer: 'Example', secret, algorithm: 'SHA512', digits: 8, period: 45, favorite: true, lastUsedAt: 1234, useCount: 2 });
  const first = await encodeBackup([account], 'correct horse battery staple');
  const second = await encodeBackup([account], 'correct horse battery staple');
  assert.notEqual(first, second);
  assert.deepEqual(await decodeBackup(first, 'correct horse battery staple'), [account]);
  await assert.rejects(decodeBackup(first, 'wrong'));
  const tampered = JSON.parse(first);
  tampered.data = `${tampered.data[0] === 'A' ? 'B' : 'A'}${tampered.data.slice(1)}`;
  await assert.rejects(decodeBackup(JSON.stringify(tampered), 'correct horse battery staple'));
  tampered.kdf.N = 2;
  await assert.rejects(decodeBackup(JSON.stringify(tampered), 'correct horse battery staple'));
});

test('secrets with spaces, hyphens and lowercase normalize to the canonical value', () => {
  const grouped = secret.toLowerCase().replace(/(.{4})/g, '$1 ').trim();
  const hyphenated = secret.replace(/(.{4})/g, '$1-').slice(0, -1);
  for (const value of [grouped, hyphenated, ` ${grouped.replace(/ /g, '  ')}\n`, grouped.replace(/ /g, '\u00a0')]) {
    assert.equal(Account.parse({ id: 'a', name: 'Spaced', secret: value }).secret, secret);
    assert.equal(parseOtpAuthUri(`otpauth://totp/Spaced?secret=${encodeURIComponent(value)}`).secret, secret);
  }
  assert.equal(parseOtpAuthUri(`otpauth://totp/Spaced?secret=${grouped.replace(/ /g, '+')}`).secret, secret);
  assert.equal(generateToken(Account.parse({ id: 'a', name: 'Spaced', secret: grouped }), 0), '755224');
  assert.throws(() => Account.parse({ id: 'a', name: 'Bad', secret: ' - - ' }));
  assert.throws(() => Account.parse({ id: 'a', name: 'Bad', secret: 'ABCD EFG1' }));
});

const make = (id: string, extra: Record<string, unknown> = {}) => Account.parse({ id, name: id, secret, ...extra });

test('account sections: no duplicates, favourites excluded from recent, recent capped and newest first', () => {
  const accounts = [
    make('a', { favorite: true, lastUsedAt: 50 }), make('b'), make('c', { lastUsedAt: 10 }), make('d', { lastUsedAt: 40 }),
    make('e', { favorite: true }), make('f', { lastUsedAt: 30 }), make('g', { lastUsedAt: 20 }), make('h', { lastUsedAt: 60 }),
    make('i', { lastUsedAt: 5 }), make('j'),
  ];
  const ids = (items: Account[]) => items.map((item) => item.id);
  const before = ids(accounts);
  const all = groupAccounts(accounts);
  assert.deepEqual(all.map((section) => [section.title, ids(section.items), section.reorderable]), [
    ['Favourites', ['a', 'e'], true],
    ['Recent', ['h', 'd', 'f', 'g', 'c'], false],
    ['Accounts', ['b', 'i', 'j'], true],
  ]);
  assert.equal(RECENT_LIMIT, 5);
  const flat = all.flatMap((section) => ids(section.items));
  assert.equal(flat.length, accounts.length);
  assert.equal(new Set(flat).size, accounts.length);
  assert.deepEqual(groupAccounts(accounts, 'favorites').map((section) => [ids(section.items), section.reorderable]), [[['a', 'e'], true]]);
  assert.deepEqual(groupAccounts(accounts, 'recent').map((section) => [ids(section.items), section.reorderable]), [[['h', 'a', 'd', 'f', 'g', 'c', 'i'], false]]);
  assert.deepEqual(ids(accounts), before);
  assert.deepEqual(groupAccounts([make('x'), make('y')]).map((section) => [section.title, ids(section.items)]), [['Accounts', ['x', 'y']]]);
  assert.deepEqual(groupAccounts([]), []);
});

test('parseOtpAuthUriList imports valid lines and reports invalid ones with line numbers and reasons', () => {
  const lines = [
    '# exported by another app',
    `otpauth://totp/Example:alice?secret=${secret}&issuer=Example`,
    '',
    'otpauth://totp/Bob?secret=INVALID1',
    `otpauth://hotp/Carol?secret=${secret}&counter=1`,
    `otpauth://totp/Dave?secret=${secret}&digits=9`,
    `otpauth://totp/Eve?secret=${secret}&period=0`,
    `otpauth://totp/Frank?secret=${secret}&counter=1`,
    `otpauth://totp/Gina:Gina?secret=${secret}&issuer=Other`,
    `otpauth://totp/?secret=${secret}`,
    'not a uri',
    `  otpauth://totp/Henry?secret=${secret.toLowerCase().replace(/(.{4})/g, '$1 ').trim()}  `,
    'otpauth-migration://offline?data=AAAA',
    `otpauth://totp/Ivy?secret=${secret}&digits=abc`,
    `otpauth://totp/Jo?secret=${secret}&secret=${secret}`,
    'otpauth://totp/Kim',
    `otpauth://totp/Lee?secret=${secret}&${'x'.repeat(100)}=1`,
  ];
  const { accounts, errors } = parseOtpAuthUriList(lines.join('\n').replace('\n\n', '\r\n\r\n'));
  assert.deepEqual(accounts.map((account) => [account.name, account.issuer, account.secret]), [['alice', 'Example', secret], ['Henry', undefined, secret]]);
  assert.deepEqual(errors, [
    { line: 4, reason: 'Invalid secret key' },
    { line: 5, reason: 'Only TOTP is supported (HOTP found)' },
    { line: 6, reason: 'Digits must be 6–8' },
    { line: 7, reason: 'Period must be 1–300 seconds' },
    { line: 8, reason: 'Unsupported parameter: counter' },
    { line: 9, reason: 'Service names do not match' },
    { line: 10, reason: 'Missing account name' },
    { line: 11, reason: 'Not a valid otpauth:// URI' },
    { line: 13, reason: 'Google Authenticator export links must be scanned as QR codes' },
    { line: 14, reason: 'Digits must be 6–8' },
    { line: 15, reason: 'Duplicate parameter: secret' },
    { line: 16, reason: 'Missing secret key' },
    { line: 17, reason: `Unsupported parameter: ${'x'.repeat(24)}` },
  ]);
  assert.deepEqual(parseOtpAuthUriList('\n# only comments\n\n'), { accounts: [], errors: [] });
  assert.ok(!JSON.stringify(errors).includes(secret));
  assert.equal(describeInvalidLines(errors.slice(0, 2)), 'Line 4: Invalid secret key\nLine 5: Only TOTP is supported (HOTP found)');
  assert.equal(describeInvalidLines(errors).split('\n').length, 6);
  assert.equal(describeInvalidLines(errors).split('\n')[5], `+${errors.length - 5} more`);
});

test('describeAccountError maps our errors and schema issues to short reasons', () => {
  const issue = (input: Record<string, unknown>) => {
    const result = CreateAccountSchema.safeParse({ name: 'Name', secret, ...input });
    assert.ok(!result.success);
    return describeAccountError(result.error);
  };
  assert.equal(issue({ name: '' }), 'Missing account name');
  assert.equal(issue({ name: undefined }), 'Missing account name');
  assert.equal(issue({ name: 'x'.repeat(201) }), 'Account name is too long');
  assert.equal(issue({ issuer: 'x'.repeat(201) }), 'Service name is too long');
  assert.equal(issue({ secret: undefined }), 'Missing secret key');
  assert.equal(issue({ algorithm: 'MD5' }), 'Algorithm must be SHA1, SHA256 or SHA512');
  assert.equal(issue({ digits: 5 }), 'Digits must be 6–8');
  assert.equal(issue({ period: 301 }), 'Period must be 1–300 seconds');
  const messages: Array<[string, string]> = [
    ['Invalid Base32 secret', 'Invalid secret key'],
    ['Invalid OTP URI', 'Not a valid otpauth:// URI'],
    ['Only TOTP URIs are supported', 'Not an otpauth://totp/ URI'],
    ['HOTP is not supported', 'Only TOTP is supported (HOTP found)'],
    ['OTP issuers do not match', 'Service names do not match'],
    ['Invalid OTP digits', 'Digits must be 6–8'],
    ['Invalid OTP period', 'Period must be 1–300 seconds'],
    ['Unsupported OTP parameter: counter', 'Unsupported parameter: counter'],
    ['Duplicate OTP parameter: digits', 'Duplicate parameter: digits'],
    ['Account already exists', 'Account already exists'],
  ];
  for (const [message, reason] of messages) assert.equal(describeAccountError(new Error(message)), reason);
  for (const unknown of [new Error('boom'), new Error('constructor'), new Error(`Unsupported OTP parameter: ${secret}\nsecret`), 'text', undefined]) {
    assert.equal(describeAccountError(unknown), 'Invalid account');
  }
  assert.equal(describeAccountError(new Error('Invalid OTP label')), 'Invalid account label');
});

test('import summaries and backup error messages', () => {
  assert.equal(summarizeImport({ added: 28, duplicates: 2, invalid: 3 }), '28 added · 2 duplicates skipped · 3 invalid skipped');
  assert.equal(summarizeImport({ added: 1, duplicates: 1, unsupported: 1 }), '1 added · 1 duplicate skipped · 1 unsupported skipped');
  assert.equal(summarizeImport({ added: 0 }), '0 added');
  assert.equal(describeBackupError(new Error('Incorrect password or damaged backup')), 'Incorrect password, or the backup file is damaged.');
  assert.equal(describeBackupError(new Error('Invalid backup password')), 'Enter the backup password.');
  assert.equal(describeBackupError(new Error('Invalid backup')), 'Not a valid OTP backup file. Check the selected format.');
  assert.equal(describeBackupError(new Error('Invalid backup content')), 'Not a valid OTP backup file. Check the selected format.');
  assert.equal(describeBackupError(new Error('anything else')), undefined);
  assert.equal(describeBackupError(Account.safeParse({}).error), 'Not a valid OTP backup file. Check the selected format.');
});

test('paste queries pick the closest match, then the most recently used, then favourites', () => {
  const make = (id: string, name: string, issuer?: string, extra: Partial<Account> = {}) =>
    Account.parse({ id, name, issuer, secret, ...extra });
  const github = make('gh', 'alice@example.com', 'GitHub');
  const gitlab = make('gl', 'alice@example.com', 'GitLab', { lastUsedAt: 10 });
  const google = make('go', 'bob@gmail.com', 'Google', { favorite: true });
  const accounts = [github, gitlab, google];
  assert.equal(findBestAccount(accounts, 'github')?.id, 'gh');
  assert.equal(findBestAccount(accounts, 'GIT')?.id, 'gl');
  assert.equal(findBestAccount(accounts, 'gmail')?.id, 'go');
  assert.equal(findBestAccount(accounts, 'ghub')?.id, 'gh');
  assert.equal(findBestAccount(accounts, 'alice')?.id, 'gl');
  assert.equal(findBestAccount([github, make('fav', 'carol', 'GitHub', { favorite: true })], 'github')?.id, 'fav');
  assert.equal(findBestAccount(accounts, 'zzz'), undefined);
  assert.equal(findBestAccount(accounts, '   '), undefined);
});

test('codes are grouped for reading and accounts are labelled by service', () => {
  assert.equal(formatCode('123456'), '123 456');
  assert.equal(formatCode('1234567'), '1234 567');
  assert.equal(formatCode('12345678'), '1234 5678');
  assert.equal(accountLabel({ name: 'alice', issuer: 'GitHub' }), 'GitHub');
  assert.equal(accountLabel({ name: 'alice' }), 'alice');
});

test('moveId and reorderAccounts', () => {
  assert.deepEqual(moveId(['a', 'b', 'c', 'd'], 'a', 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(moveId(['a', 'b', 'c', 'd'], 'd', 0), ['d', 'a', 'b', 'c']);
  assert.deepEqual(moveId(['a', 'b'], 'b', 9), ['a', 'b']);
  assert.deepEqual(moveId(['a', 'b'], 'x', 0), ['a', 'b']);
  const accounts = ['A', 'b', 'C', 'd', 'E'].map((id) => ({ id }));
  const order = (ids: string[]) => reorderAccounts(accounts, ids).map((account) => account.id);
  assert.deepEqual(order(['E', 'A', 'C']), ['E', 'b', 'A', 'd', 'C']);
  assert.deepEqual(order(['C', 'C', 'x', 'A']), ['C', 'b', 'A', 'd', 'E']);
});
