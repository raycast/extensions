import { Clipboard, showHUD } from '@raycast/api';
import { getLastUsedAccount, setLastUsedAccountId } from './store';
import { generateToken } from './totp';

export default async function Command() {
  const account = await getLastUsedAccount();

  if (!account) {
    await showHUD('No accounts found');
    return;
  }

  try {
    const token = generateToken(account.secret);
    await setLastUsedAccountId(account.id);
    await Clipboard.paste(token);
    await showHUD(`Pasted OTP for ${account.name}`);
  } catch {
    await showHUD(`Invalid secret for ${account.name}`);
  }
}
