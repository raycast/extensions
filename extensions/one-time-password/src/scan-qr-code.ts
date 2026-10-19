import { BrowserExtension, LaunchProps, closeMainWindow, environment, showHUD } from '@raycast/api';
import { copySecret } from './clipboard';
import { accountLabel, parseOtpAuthUri } from './model';
import { hostnameOf, serviceName } from './services';
import * as store from './store';
import { generateToken } from './totp';

type Mode = 'scan' | 'select';

// The page showing a setup QR code is usually the active browser tab; needs the Raycast browser extension.
async function activeSiteName(): Promise<string | undefined> {
  try {
    if (!environment.canAccess(BrowserExtension)) return undefined;
    const tab = (await BrowserExtension.getTabs()).find((item) => item.active);
    return tab && hostnameOf(tab.url) ? serviceName(tab.url) : undefined;
  } catch {
    return undefined;
  }
}

// Returns the HUD text once a setup code is handled, or undefined if the data isn't an OTP setup code.
async function addFromSetupData(data: string, onScreen: boolean): Promise<string | undefined> {
  if (/^otpauth-migration:/i.test(data)) {
    const { describeMigrationImport, describeSkipped, extractAccountsFromMigrationUrl } =
      await import('./google-authenticator');
    const migration = await extractAccountsFromMigrationUrl(data).catch(() => undefined);
    if (!migration) return 'Unsupported Google Authenticator QR code';
    if (!migration.accounts.length) return `No supported accounts: ${describeSkipped(migration.skipped)}`;
    const imported = await store.importAccounts(migration.accounts);
    const { title } = describeMigrationImport(migration, imported);
    const { batchIndex, batchSize } = migration;
    return batchSize > 1 ? `${title} · Batch ${batchIndex + 1} of ${batchSize}` : title;
  }
  let parsed;
  try {
    parsed = parseOtpAuthUri(data);
  } catch {
    return undefined;
  }
  // Accounts added before the service name was tidied up keep matching their original setup code.
  let account = await store.findAccount(parsed);
  let added = false;
  if (!account) {
    const issuer = parsed.issuer ? serviceName(parsed.issuer) : onScreen ? await activeSiteName() : undefined;
    const named = { ...parsed, issuer };
    try {
      account = await store.addAccount(named);
      added = true;
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'Account already exists') throw error;
      account = await store.findAccount(named);
    }
  }
  if (!account) return 'Account already exists';
  // Setup pages ask for a code straight away, so it is ready to paste.
  await copySecret(generateToken(account));
  await store.setLastUsedAccountId(account.id);
  return `${added ? 'Added' : 'Already added:'} ${accountLabel(account)} · Code copied`;
}

export default async function Command(props: LaunchProps<{ launchContext: { mode?: Mode } }>) {
  await closeMainWindow();
  const { readDataFromClipboard, readDataFromQRCodeOnScreen } = await import('./utils');
  const screen = (mode: Mode) => async () => ({ data: (await readDataFromQRCodeOnScreen(mode)).data, onScreen: true });
  const clipboard = async () => ({ data: await readDataFromClipboard(), onScreen: false });
  const sources =
    props.launchContext?.mode === 'select' ? [screen('select')] : [screen('scan'), clipboard, screen('select')];
  let found = false;
  try {
    for (const read of sources) {
      const { data, onScreen } = (await read().catch(() => undefined)) ?? {};
      if (!data) continue;
      found = true;
      const message = await addFromSetupData(data, !!onScreen);
      if (message) return showHUD(message);
    }
    await showHUD(found ? 'Not a TOTP setup QR code' : 'No QR code found');
  } catch {
    await showHUD('Could not add account');
  }
}
