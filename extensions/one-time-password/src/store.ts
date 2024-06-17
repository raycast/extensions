import { LocalStorage } from '@raycast/api';
import crypto from 'crypto';
import { z } from 'zod';
import { parseUrl, sortByPrio } from './utils';

export const Account = z.object({
  id: z.string(),
  name: z.string(),
  issuer: z.string().optional(),
  secret: z.string(),
  token: z.string().optional(),
  prio: z.number().optional(),
});
export type Account = z.infer<typeof Account>;

type AccountWithoutId = Omit<Account, 'id'>;

const STORAGE_KEY = 'one-time-password-accounts';

function generateAccountId(account: AccountWithoutId) {
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
  return z.array(Account).parse(JSON.parse(data)).sort(sortByPrio);
}

function isOtpUrl(str: string) {
  return str.startsWith('otpauth://');
}

export async function addAccount(account: AccountWithoutId) {
  const accounts = await getAccounts();

  if (isOtpUrl(account.secret)) {
    const { secret, issuer } = parseUrl<'secret' | 'issuer'>(account.secret);
    account.secret = secret || '';
    account.issuer = issuer || '';
  }

  accounts.push({ ...account, id: generateAccountId(account) });
  await save(accounts);
}

export async function removeAccount(id: string) {
  const accounts = await getAccounts();
  const index = accounts.findIndex((account) => account.id === id);
  accounts.splice(index, 1);

  await save(accounts);
}

export async function updateAccount(id: string, account: AccountWithoutId) {
  const accounts = await getAccounts();
  const accountFound = accounts.find((account) => account.id === id);
  if (!accountFound) return;
  accountFound.name = account.name;
  accountFound.secret = account.secret;
  accountFound.prio = account.prio;
  await save(accounts);
}
