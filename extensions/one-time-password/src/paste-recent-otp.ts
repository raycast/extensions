import { Clipboard, showHUD } from '@raycast/api';
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
    token = generateToken(account.secret);
  } catch {
    await showHUD(`Invalid secret for ${account.name}`);
    return;
  }

  await setLastUsedAccountId(account.id);
  await Clipboard.paste(token);
  await showHUD(`Pasted OTP for ${account.name}`);
}
