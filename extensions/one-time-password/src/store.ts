import { LocalStorage } from '@raycast/api';
import crypto from 'crypto';
import { z } from 'zod';
import { parseUrl, sortByIndex } from './utils';

export const OldAccount = z.object({
  id: z.string(),
  name: z.string(),
  issuer: z.string().optional(),
  secret: z.string(),
  token: z.string().optional(),
});

export const Account = OldAccount.extend({
  index: z.number(),
});
export type Account = z.infer<typeof Account>;

type CreateAccount = Omit<Account, 'id' | 'index'>;
type UpdateAccount = Omit<Account, 'index'>;

const STORAGE_KEY = 'one-time-password-accounts';

function generateAccountId(account: Pick<Account, 'name' | 'secret'>) {
  const hash = crypto.createHash('sha256');
  const { name, secret } = account;
  const str = `${name}:${secret}`;
  hash.update(str);
  return hash.digest('hex');
}
async function save(accounts: Account[]) {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

async function migrateOldAccounts(data: string) {
  const oldAccounts = OldAccount.array().parse(JSON.parse(data));
  const fixAttempted = oldAccounts.map((o, i) => ({ ...o, index: i }));

  const accounts = Account.array().parse(fixAttempted).sort(sortByIndex);
  await save(accounts);

  return accounts;
}

export async function getAccounts() {
  const data = (await LocalStorage.getItem<string>(STORAGE_KEY)) || '[]';

  try {
    return Account.array().parse(JSON.parse(data)).sort(sortByIndex);
  } catch (e) {
    return migrateOldAccounts(data);
  }
}

function isOtpUrl(str: string) {
  return str.startsWith('otpauth://');
}

export async function addAccount(account: CreateAccount) {
  const accounts = await getAccounts();

  if (isOtpUrl(account.secret)) {
    const { secret, issuer } = parseUrl<'secret' | 'issuer'>(account.secret);
    account.secret = secret || '';
    account.issuer = issuer || '';
  }

  accounts.push({ ...account, index: accounts.length, id: generateAccountId(account) });
  await save(accounts);
}

export async function removeAccount(id: string) {
  const accounts = await getAccounts();
  const index = accounts.findIndex((account) => account.id === id);
  accounts.splice(index, 1);

  await save(accounts);
}

export async function updateAccount(account: UpdateAccount) {
  const accounts = await getAccounts();

  const accountFound = accounts.find((acc) => acc.id === account.id);
  if (!accountFound) return;

  accountFound.name = account.name;
  accountFound.secret = account.secret;

  await save(accounts);
}

export const MoveDir = { UP: -1, DOWN: 1 } as const;
export type MoveDir = (typeof MoveDir)[keyof typeof MoveDir];
export async function moveAccount(id: string, dir: MoveDir) {
  const accounts = await getAccounts();

  const moved = accounts.find((account) => account.id === id);
  if (!moved) return;

  const fromIndex = moved.index ?? 0;
  const toIndex = fromIndex + dir;

  const target = accounts.find((account) => account.index === toIndex);
  if (!target) return;

  moved.index = toIndex;
  target.index = fromIndex;

  await save(accounts);
}
