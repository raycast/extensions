import { LocalStorage } from '@raycast/api';
import crypto from 'crypto';
import { z } from 'zod';
import { parseUrl, sortByPrio } from './utils';

export const OldAccount = z.object({
  id: z.string(),
  name: z.string(),
  issuer: z.string().optional(),
  secret: z.string(),
  token: z.string().optional(),
});

export const Account = OldAccount.extend({
  prio: z.number(),
});
export type Account = z.infer<typeof Account>;

type CreateAccount = Omit<Account, 'id' | 'prio'>;
type UpdateAccount = Omit<Account, 'prio'>;

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

export async function getAccounts() {
  const data = (await LocalStorage.getItem<string>(STORAGE_KEY)) || '[]';

  // P0: migrate old accounts
  
  return Account.array().parse(JSON.parse(data)).sort(sortByPrio);
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

  accounts.push({ ...account, prio: accounts.length, id: generateAccountId(account) });
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

  const fromPrio = moved.prio ?? 0;
  const toPrio = fromPrio + dir;

  const target = accounts.find((account) => account.prio === toPrio);
  if (!target) return;

  moved.prio = toPrio;
  target.prio = fromPrio;

  await save(accounts);
}
