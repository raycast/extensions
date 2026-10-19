import { Action, ActionPanel, Detail, Icon, List, Toast, confirmAlert, showToast } from '@raycast/api';
import { usePromise } from '@raycast/utils';
import QRCode from 'qrcode';
import { useMemo, useRef, useState } from 'react';
import { accountIcon } from './account-icon';
import { copySecret } from './clipboard';
import { Account, accountLabel, exportOtpAuthUri } from './model';

const COLON_NOTE =
  'This account has a colon in its name or service, which the standard setup format cannot represent. Remove the colon in Edit Account to create a QR code, or use an encrypted backup to keep it unchanged.';

function setupUri(account: Account): string | undefined {
  try {
    return exportOtpAuthUri(account);
  } catch {
    return undefined;
  }
}

// Generated in memory only; neither the QR code nor the secret is written to disk.
// Rendered at twice the displayed size so it stays sharp on Retina screens.
function qrImage(uri: string): Promise<string | undefined> {
  return QRCode.toDataURL(uri, { errorCorrectionLevel: 'M', margin: 2, width: 640 }).catch(() => undefined);
}

// Results are kept per URI so revisiting an account is instant; stale results never show for another account.
function useQrImage(uri: string | undefined): { image?: string; loading: boolean } {
  const cache = useRef(new Map<string, string | undefined>());
  const { data, isLoading } = usePromise(
    async (value: string) => {
      if (!cache.current.has(value)) cache.current.set(value, await qrImage(value));
      return { uri: value, image: cache.current.get(value) };
    },
    [uri ?? ''],
    { execute: !!uri },
  );
  const ready = !!uri && data?.uri === uri;
  return { image: ready ? data?.image : undefined, loading: !!uri && (!ready || isLoading) };
}

const WARNING = 'Anyone who scans this code can generate your codes.';

// Sized explicitly so the whole code fits the pane; Raycast otherwise draws it at full width and crops the bottom.
function qrMarkdown(
  uri: string | undefined,
  image: string | undefined,
  loading: boolean,
  size: number,
  caption: string,
) {
  if (!uri) return COLON_NOTE;
  if (image) return `![Setup QR code](${image}?raycast-width=${size}&raycast-height=${size})\n\n${caption}`;
  return loading ? '' : 'The QR code could not be generated.';
}

function settingsLine(account: Account): string {
  return `${account.algorithm} · ${account.digits} digits · ${account.period}s`;
}

function details(account: Account): Array<[string, string | undefined]> {
  return [
    ['Service', account.issuer],
    ['Username', account.name],
    ['Algorithm', account.algorithm],
    ['Digits', String(account.digits)],
    ['Period', `${account.period} seconds`],
  ];
}

export async function copySetupUri(account: Account) {
  const uri = setupUri(account);
  if (!uri) {
    await showToast({ style: Toast.Style.Failure, title: 'Could not copy setup URI', message: COLON_NOTE });
    return;
  }
  await copySecret(uri);
  await showToast({ style: Toast.Style.Success, title: 'Setup URI copied' });
}

async function copySecretKey(account: Account) {
  await copySecret(account.secret);
  await showToast({ style: Toast.Style.Success, title: 'Secret key copied' });
}

export function confirmShowAllSetupQr(): Promise<boolean> {
  return confirmAlert({
    title: 'Show All Setup QR Codes?',
    message:
      'These QR codes contain your secret keys. Anyone who can see or scan them can generate your codes, so only show them on a private screen.',
    primaryAction: { title: 'Show QR Codes' },
  });
}

function CopyActions({ account }: { account: Account }) {
  return (
    <>
      <Action title="Copy Setup URI" icon={Icon.Link} onAction={() => copySetupUri(account)} />
      <Action title="Copy Secret Key" icon={Icon.Key} onAction={() => copySecretKey(account)} />
    </>
  );
}

export function SetupQrDetail({ account }: { account: Account }) {
  const uri = useMemo(() => setupUri(account), [account]);
  const { image, loading } = useQrImage(uri);
  return (
    <Detail
      navigationTitle="Setup QR Code"
      isLoading={loading}
      markdown={qrMarkdown(uri, image, loading, 300, WARNING)}
      metadata={
        <Detail.Metadata>
          {details(account).map(([title, text]) =>
            text ? (
              <Detail.Metadata.Label
                key={title}
                title={title}
                text={text}
                icon={title === 'Service' ? accountIcon(account) : undefined}
              />
            ) : null,
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <CopyActions account={account} />
        </ActionPanel>
      }
    />
  );
}

export function SetupQrList({ accounts }: { accounts: Account[] }) {
  const [selected, setSelected] = useState(accounts[0]?.id);
  const account = accounts.find((item) => item.id === selected);
  const uri = useMemo(() => (account ? setupUri(account) : undefined), [account]);
  // Only the selected account's QR code is generated, so large lists stay responsive.
  const { image, loading } = useQrImage(uri);
  return (
    <List
      isShowingDetail
      navigationTitle="Setup QR Codes"
      searchBarPlaceholder="Search accounts or services…"
      onSelectionChange={(id) => id && setSelected(id)}
    >
      {accounts.map((item) => (
        <List.Item
          key={item.id}
          id={item.id}
          title={accountLabel(item)}
          subtitle={item.issuer ? item.name : undefined}
          icon={accountIcon(item)}
          keywords={[item.name, item.issuer ?? '']}
          detail={
            // No metadata panel here: it takes half the pane. Service and username are in the row already.
            item.id === selected ? (
              <List.Item.Detail
                isLoading={loading}
                markdown={qrMarkdown(uri, image, loading, 240, `${settingsLine(item)}\n\n${WARNING}`)}
              />
            ) : undefined
          }
          actions={
            <ActionPanel>
              <CopyActions account={item} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
