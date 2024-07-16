import {
  Form,
  Alert,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  List,
  useNavigation,
  getPreferenceValues,
  openExtensionPreferences,
  popToRoot,
  confirmAlert,
  Color,
} from '@raycast/api';
import { useEffect, useState } from 'react';
import { getProgressIcon } from '@raycast/utils';
import { z } from 'zod';
import * as store from './store';
import {
  readDataFromQRCodeOnScreen,
  getCurrentSeconds,
  splitStrToParts,
  ScanType,
  parseUrl,
  getPrioTag,
} from './utils';
import { TOKEN_TIME, generateToken } from './totp';
import { extractAccountsFromMigrationUrl } from './google-authenticator';
import { config } from './config';

type Preferences = {
  passwordVisibility?: boolean;
};

export default () => {
  const preferences = getPreferenceValues<Preferences>();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [timer, setTimer] = useState(0);
  const [accounts, setAccounts] = useState<store.Account[]>([]);
  const [qrCodeScanType, setQRCodeScanType] = useState<ScanType>(null);

  async function loadAccounts() {
    if (accounts.length === 0) setLoading(true);
    setAccounts(await store.getAccounts());
    setLoading(false);
  }

  async function handleRemoveAccount(account: store.Account) {
    const confirmed = await confirmAlert({
      title: 'Remove Account',
      message: `Are you sure you want to remove ${account.name}?`,
      icon: { source: Icon.Trash, tintColor: Color.Red },
      primaryAction: {
        title: 'Remove',
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    setLoading(true);
    await store.removeAccount(account.id);
    await loadAccounts();

    showToast({
      style: Toast.Style.Success,
      title: `${account.name} removed`,
    });
  }

  async function handleGoogleAuthenticatorMigration(resData: string) {
    const { data } = parseUrl<'data'>(resData);
    const accounts = await extractAccountsFromMigrationUrl(data);

    const confirmed = await confirmAlert({
      title: 'Google Authenticator Migration',
      message: `Are you sure you want to import ${accounts.length} accounts from Google Authenticator?`,
    });

    if (!confirmed) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Google Authenticator migration cancelled',
      });
      return;
    }

    for (const account of accounts) {
      await store.addAccount(account);
    }
    showToast({
      style: Toast.Style.Success,
      title: `${accounts.length} accounts imported`,
    });
  }

  async function scanQRCode(type: ScanType) {
    if (qrCodeScanType) return;

    setQRCodeScanType(type);
    const response = await readDataFromQRCodeOnScreen(type);
    setQRCodeScanType(null);

    if (!response?.data) {
      showToast({
        style: Toast.Style.Failure,
        title: 'QR code detection failed',
      });
      return;
    }

    if (response.isGoogleAuthenticatorMigration) {
      await handleGoogleAuthenticatorMigration(response.data);
      await loadAccounts();
    } else {
      navigation.push(<SetupKey onSubmit={handleFormSubmit} secret={response.data} />);
    }
  }

  async function handleFormSubmit() {
    setLoading(true);
    navigation.pop();
    await loadAccounts();
  }

  function update() {
    setTimer(TOKEN_TIME - (getCurrentSeconds() % TOKEN_TIME));
  }

  function getProgressColor() {
    if (timer > 5) {
      return Color.Green;
    } else {
      return Color.Red;
    }
  }

  function displayToken(secret: string) {
    if (!preferences.passwordVisibility) {
      return splitStrToParts('•'.repeat(6));
    } else {
      try {
        const token = generateToken(secret);
        return splitStrToParts(token);
      } catch (err) {
        return 'Invalid secret';
      }
    }
  }

  function getCopyToClipboardContent(secret: string) {
    try {
      return generateToken(secret);
    } catch (err) {
      return '';
    }
  }

  useEffect(() => {
    loadAccounts();
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <List isLoading={loading}>
      <List.Section title="Accounts">
        {accounts.map((account) => (
          <List.Item
            key={account.id}
            icon={{ source: Icon.Key, tintColor: config.colors.key }}
            title={account.name}
            subtitle={displayToken(account.secret)}
            keywords={[account.issuer ?? '', account.name]}
            accessories={[
              getPrioTag(account.prio),
              account.issuer ? { tag: account.issuer } : {},
              {
                icon: { source: getProgressIcon(timer / TOKEN_TIME), tintColor: getProgressColor() },
                text: `${timer}s`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={getCopyToClipboardContent(account.secret)} />
                <Action.Paste content={getCopyToClipboardContent(account.secret)} />
                {(account.prio ?? 0) > 0 && (
                  <Action
                    title="Move up"
                    icon={Icon.ArrowUp}
                    onAction={async () => {
                      await store.moveAccount(account.id, store.MoveDir.UP);
                      await loadAccounts();
                    }}
                    shortcut={{ modifiers: ['cmd', 'opt'], key: 'arrowUp' }}
                  />
                )}
                {(account.prio ?? 0) < accounts.length - 1 && (
                  <Action
                    title="Move down"
                    icon={Icon.ArrowDown}
                    onAction={async () => {
                      await store.moveAccount(account.id, store.MoveDir.DOWN);
                      await loadAccounts();
                    }}
                    shortcut={{ modifiers: ['cmd', 'opt'], key: 'arrowDown' }}
                  />
                )}
                <Action.Push
                  title="Edit Account"
                  shortcut={{ modifiers: ['cmd'], key: 'e' }}
                  icon={Icon.Pencil}
                  target={
                    <SetupKey id={account.id} name={account.name} secret={account.secret} onSubmit={handleFormSubmit} />
                  }
                />
                <Action
                  title="Remove Account"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ['cmd'], key: 'backspace' }}
                  onAction={() => handleRemoveAccount(account)}
                />
                <Action
                  title={`${preferences.passwordVisibility ? 'Hide' : 'Show'} Password`}
                  icon={preferences.passwordVisibility ? Icon.EyeDisabled : Icon.Eye}
                  onAction={() => {
                    openExtensionPreferences();
                    popToRoot();
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {!loading && ( // NOTE: defers rendering so accounts are in focus
        <List.Section title="New">
          <List.Item
            title={'Create new'}
            subtitle={'Create a new one-time password'}
            icon={Icon.Plus}
            accessories={
              !qrCodeScanType
                ? [
                    {
                      icon: Icon.Camera,
                      tag: {
                        value: 'Scan QR',
                        color: '#ded260',
                      },
                    },
                    {
                      icon: Icon.Keyboard,
                      tag: 'Enter Setup Key',
                    },
                  ]
                : qrCodeScanType === 'scan'
                ? [{ text: 'Scanning QR Code...' }]
                : [{ text: 'Select a QR Code' }]
            }
            actions={
              <ActionPanel>
                <Action title="Scan a QR Code" icon={Icon.Camera} onAction={() => scanQRCode('scan')} />
                <Action.Push
                  title="Enter a Setup Key"
                  icon={Icon.Keyboard}
                  target={<SetupKey onSubmit={handleFormSubmit} />}
                />
                <Action
                  title="Select a QR Code"
                  icon={Icon.Camera}
                  shortcut={{ modifiers: ['cmd'], key: 'i' }}
                  onAction={() => scanQRCode('select')}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
};

type SetupKeyProps = {
  onSubmit: () => void;
  id?: string;
  name?: string;
  secret?: string;
};

function SetupKey(props: SetupKeyProps) {
  const [name, setName] = useState(props.name ?? '');
  const [secret, setSecret] = useState(props.secret ?? '');

  async function handleSubmit() {
    if (props.id) await store.updateAccount({ id: props.id, name, secret });
    else await store.addAccount({ name, secret });

    props.onSubmit();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" value={name} onChange={setName} />
      <Form.TextField id="secret" title="Secret" value={secret} onChange={setSecret} />
    </Form>
  );
}
