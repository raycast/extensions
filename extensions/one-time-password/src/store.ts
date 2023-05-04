import { LocalStorage } from '@raycast/api';
import crypto from 'crypto';

export type Account = {
  id: string;
  name: string;
  issuer?: string;
  secret: string;
  token?: string;
};

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

export async function getAccounts(): Promise<Account[]> {
  const data = (await LocalStorage.getItem(STORAGE_KEY)) || '[]';
  return JSON.parse(data as string);
}

function isOtpUrl(str: string) {
  return str.startsWith('otpauth://');
}

export async function addAccount(account: AccountWithoutId) {
  const accounts = await getAccounts();

  if (isOtpUrl(account.secret)) {
    const qs = account.secret.slice(account.secret.indexOf('?'));
    const searchParams = new URLSearchParams(qs);
    account.secret = searchParams.get('secret') || '';
    account.issuer = searchParams.get('issuer') || '';
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
  await save(accounts);
}
