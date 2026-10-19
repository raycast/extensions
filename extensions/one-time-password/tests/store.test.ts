import assert from 'node:assert/strict';
import { test } from 'node:test';
import { encodeBase32 } from '../src/model';

const values = new Map<string, string>();
const moduleLoader = require('node:module') as { _load: (name: string, parent?: unknown, isMain?: boolean) => unknown };
const originalLoad = moduleLoader._load;
moduleLoader._load = function (name, parent, isMain) {
  if (name === '@raycast/api') {
    return { LocalStorage: {
      getItem: async (key: string) => values.get(key),
      setItem: async (key: string, value: string) => { values.set(key, value); },
      removeItem: async (key: string) => { values.delete(key); },
    } };
  }
  return originalLoad.call(this, name, parent, isMain);
};
const store = require('../src/store') as typeof import('../src/store');
moduleLoader._load = originalLoad;

const secret = encodeBase32(Buffer.from('12345678901234567890'));

test('legacy storage defaults and usage metadata', async () => {
  values.clear();
  values.set('one-time-password-accounts', JSON.stringify([{ id: 'old', name: 'Legacy', secret, issuer: '' }]));
  assert.equal((await store.getAccounts())[0].period, 30);
  await store.setLastUsedAccountId('old');
  const used = (await store.getAccounts())[0];
  assert.equal(used.useCount, 1);
  assert.ok(used.lastUsedAt);
  assert.equal((await store.getLastUsedAccount())?.id, 'old');
  await store.toggleFavorite('old');
  assert.equal((await store.getAccounts())[0].favorite, true);
  await store.clearRecents();
  assert.equal((await store.getAccounts())[0].useCount, 0);
  assert.equal((await store.getLastUsedAccount()), undefined);
});

test('import validates all records and deduplicates by seed, settings and identity', async () => {
  values.clear();
  const a = { name: 'Alice', issuer: 'Example', secret };
  await assert.rejects(store.importAccounts([a, { name: 'Bad', secret: 'INVALID1' }]));
  assert.equal((await store.getAccounts()).length, 0);
  assert.deepEqual(await store.importAccounts([a, a, { ...a, name: 'Bob' }]), { added: 2, skipped: 1 });
  assert.deepEqual(await store.importAccounts([{ ...a, digits: 8 }, { ...a, algorithm: 'SHA256' }]), { added: 2, skipped: 0 });
  assert.equal((await store.getAccounts()).length, 4);
});

test('URI settings override defaults supplied with an account and recents survive restore', async () => {
  values.clear();
  const uri = `otpauth://totp/Example:Alice?secret=${secret}&issuer=Example&algorithm=SHA512&digits=8&period=60`;
  await store.addAccount({ name: 'Ignored', secret: uri, algorithm: 'SHA1', digits: 6, period: 30 });
  const account = (await store.getAccounts())[0];
  assert.deepEqual([account.name, account.algorithm, account.digits, account.period], ['Alice', 'SHA512', 8, 60]);
  await store.importAccounts([{ ...account, id: 'second', name: 'Another', lastUsedAt: 5000, useCount: 3 }]);
  assert.equal((await store.getLastUsedAccount())?.name, 'Another');
});

test('spaced and hyphenated secrets are stored normalized and deduplicate against existing accounts', async () => {
  values.clear();
  const grouped = secret.toLowerCase().replace(/(.{4})/g, '$1 ').trim();
  const a = { name: 'Alice', issuer: 'Example', secret: grouped };
  await store.addAccount(a);
  assert.equal((await store.getAccounts())[0].secret, secret);
  await assert.rejects(store.addAccount({ ...a, secret: secret.replace(/(.{4})/g, '$1-').slice(0, -1) }), /Account already exists/);
  assert.deepEqual(await store.importAccounts([{ ...a, secret }, { ...a, secret: grouped.toUpperCase() }, { ...a, name: 'Bob' }]), { added: 1, skipped: 2 });
  assert.equal((await store.getAccounts()).length, 2);
});

test('reordering a section keeps the places of accounts listed in other sections', async () => {
  values.clear();
  for (const name of ['A', 'B', 'C', 'D']) await store.addAccount({ name, issuer: 'Example', secret: encodeBase32(Buffer.from(`${name}2345678901234567890`)) });
  const id = async (name: string) => (await store.getAccounts()).find((account) => account.name === name)!.id;
  await store.toggleFavorite(await id('A'));
  await store.toggleFavorite(await id('C'));
  // Favourites are listed as [A, C]; moving C above A must not swap it with B, which sits between them in storage.
  await store.setOrder([await id('C'), await id('A')]);
  assert.deepEqual((await store.getAccounts()).map((account) => account.name), ['C', 'B', 'A', 'D']);
});

test('records the original extension saved unvalidated neither hide other accounts nor get lost', async () => {
  values.clear();
  const unreadable = [{ id: 'bad-secret', name: 'Typo', secret: 'not a key!' }];
  const stored = [
    { id: 'spaced', name: 'Spaced', issuer: '', secret: secret.toLowerCase().replace(/(.{4})/g, '$1 ').trim() },
    { id: 'uri', name: 'Edited', secret: `otpauth://totp/Example:Bob?secret=${secret}&issuer=Example` },
    ...unreadable,
    // The original form had no required fields; pasting a setup link as the key filled in only the service.
    { id: 'no-name', name: '', issuer: 'GitHub', secret },
    { id: 'blank', name: '  ', secret },
  ];
  values.set('one-time-password-accounts', JSON.stringify(stored));
  assert.deepEqual((await store.getAccounts()).map((account) => [account.id, account.name, account.secret]), [
    ['spaced', 'Spaced', secret],
    ['uri', 'Bob', secret],
    ['no-name', 'Unnamed account', secret],
    ['blank', 'Unnamed account', secret],
  ]);
  await store.toggleFavorite('spaced');
  const saved = JSON.parse(values.get('one-time-password-accounts')!);
  assert.deepEqual(saved.slice(4), unreadable);
  assert.equal((await store.getAccounts())[0].favorite, true);
  assert.equal((await store.getAccounts())[2].issuer, 'GitHub');
  await assert.rejects(store.addAccount({ name: ' ', secret }));
});

test('accounts the original extension saved twice under one id each stay separate', async () => {
  values.clear();
  // The original id was a hash of the name and key, and the same account could be added more than once.
  const copy = { id: 'hash', name: 'Twice', secret };
  values.set('one-time-password-accounts', JSON.stringify([copy, { id: 'other', name: 'Other', secret }, copy]));
  const ids = async () => (await store.getAccounts()).map((account) => account.id);
  const first = await ids();
  assert.equal(new Set(first).size, 3);
  assert.deepEqual(await ids(), first);
  await store.setOrder([first[2], first[0]]);
  assert.deepEqual(await ids(), [first[2], first[1], first[0]]);
  await store.removeAccount(first[0]);
  assert.deepEqual(await ids(), [first[2], first[1]]);
  assert.equal(JSON.parse(values.get('one-time-password-accounts')!).length, 2);
});
