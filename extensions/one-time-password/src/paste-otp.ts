import { LaunchProps, LaunchType, launchCommand, showHUD } from '@raycast/api';
import { pasteSecret } from './clipboard';
import { accountLabel, findBestAccount } from './model';
import { getAccounts, setLastUsedAccountId } from './store';
import { generateToken } from './totp';

export default async function Command(props: LaunchProps<{ arguments: { query: string } }>) {
  const query = props.arguments.query?.trim() ?? '';
  const account = findBestAccount(await getAccounts(), query);
  if (!account) {
    // Nothing matched: open the account list with the query so it can be refined.
    await launchCommand({ name: 'one-time-password', type: LaunchType.UserInitiated, fallbackText: query });
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
