import { showHUD } from '@raycast/api';
import { pasteSecret } from './clipboard';
import { accountLabel } from './model';
import { getAccounts, getLastUsedAccount, setLastUsedAccountId } from './store';
import { generateToken } from './totp';

export default async function Command() {
  const accounts = await getAccounts();
  if (accounts.length === 0) {
    await showHUD('No accounts found');
    return;
  }

  const account = await getLastUsedAccount();
  if (!account) {
    await showHUD('No recently used account');
    return;
  }

  let token: string;
  try {
    token = generateToken(account);
  } catch {
    await showHUD(`Invalid secret for ${accountLabel(account)}`);
    return;
  }

  await pasteSecret(token);
  await setLastUsedAccountId(account.id);
  await showHUD(`Pasted code for ${accountLabel(account)}`);
}
