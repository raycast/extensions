import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Grid,
  Keyboard,
  LaunchProps,
  LaunchType,
  List,
  Toast,
  closeMainWindow,
  confirmAlert,
  getPreferenceValues,
  launchCommand,
  showHUD,
  showToast,
  useNavigation,
} from '@raycast/api';
import { useEffect, useMemo, useState } from 'react';
import { getProgressIcon, useCachedState } from '@raycast/utils';
import * as store from './store';
import { formatCode, generateToken } from './totp';
import { AccountForm } from './account-form';
import { BackupForm } from './backup-form';
import { copySecret, pasteSecret } from './clipboard';
import { AccountFilter, AccountSection, accountLabel, groupAccounts, moveId } from './model';
import { SetupQrDetail, SetupQrList, confirmShowAllSetupQr, copySetupUri } from './setup-qr';
import { accountIcon, logoUrl } from './account-icon';
import { useLogos } from './logo-cache';
import { initials } from './services';
import { codeTile } from './code-tile';
import { RearrangeAccounts } from './rearrange';

type Preferences = { passwordVisibility?: boolean; primaryAction?: 'copy' | 'paste' };

// Scanning runs as its own no-view command so the Raycast window is closed before the screen is captured.
function scanQr(mode: 'scan' | 'select') {
  return launchCommand({ name: 'scan-qr-code', type: LaunchType.UserInitiated, context: { mode } });
}

export default function Command(props: LaunchProps) {
  const preferences = getPreferenceValues<Preferences>();
  const navigation = useNavigation();
  const [accounts, setAccounts] = useState<store.Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [filter, setFilter] = useState<AccountFilter>('all');
  const [searchText, setSearchText] = useState(props.fallbackText ?? '');
  const [visible, setVisible] = useState(preferences.passwordVisibility ?? true);
  const [layout, setLayout] = useCachedState<'list' | 'grid'>('layout', 'list');
  const pastePrimary = preferences.primaryAction === 'paste';
  async function reload() {
    try {
      setAccounts(await store.getAccounts());
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Could not load accounts',
        message: 'Stored accounts were left untouched.',
      });
    } finally {
      setLoading(false);
    }
  }
  async function saved() {
    navigation.pop();
    await reload();
  }
  useEffect(() => {
    void reload();
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  const groups = useMemo(() => groupAccounts(accounts, filter), [accounts, filter]);
  const logoUrls = useMemo(() => accounts.map(logoUrl).filter((url): url is string => !!url), [accounts]);
  const logos = useLogos(logoUrls, layout === 'grid');
  async function useCode(account: store.Account, paste: boolean, next = false) {
    try {
      const token = generateToken(account, Date.now() + (next ? account.period * 1000 : 0));
      if (paste) await pasteSecret(token);
      else await copySecret(token);
      await store.setLastUsedAccountId(account.id);
      await reload();
      if (paste) await closeMainWindow();
      else await showHUD(`Copied ${next ? 'next ' : ''}code for ${accountLabel(account)}`);
    } catch {
      await showToast({ title: 'Could not use code', style: Toast.Style.Failure });
    }
  }
  async function showAllSetupQr() {
    if (await confirmShowAllSetupQr()) navigation.push(<SetupQrList accounts={accounts} />);
  }
  const addActions = (
    <>
      <Action title="Scan QR Code" icon={Icon.Camera} onAction={() => scanQr('scan')} />
      <Action title="Select QR Region" icon={Icon.Crop} onAction={() => scanQr('select')} />
      <Action.Push
        title="Add Account"
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        target={<AccountForm onSaved={saved} />}
      />
    </>
  );
  const globalActions = (
    <ActionPanel.Section title="Manage">
      {addActions}
      <Action.Push title="Import Accounts" icon={Icon.Download} target={<BackupForm mode="import" onDone={saved} />} />
      {accounts.length > 0 && (
        <>
          <Action.Push
            title="Export & Backup"
            icon={Icon.Upload}
            target={<BackupForm mode="export" onDone={saved} />}
          />
          <Action title="Show All Setup QR Codes" icon={Icon.Mobile} onAction={showAllSetupQr} />
          <Action
            title={visible ? 'Hide Codes' : 'Show Codes'}
            icon={visible ? Icon.EyeDisabled : Icon.Eye}
            onAction={() => setVisible((v) => !v)}
          />
          <Action
            title={layout === 'grid' ? 'Show as List' : 'Show as Grid'}
            icon={layout === 'grid' ? Icon.List : Icon.AppWindowGrid3x3}
            shortcut={{
              macOS: { modifiers: ['cmd', 'shift'], key: 'l' },
              Windows: { modifiers: ['ctrl', 'shift'], key: 'l' },
            }}
            onAction={() => setLayout(layout === 'grid' ? 'list' : 'grid')}
          />
        </>
      )}
      {accounts.some((account) => account.lastUsedAt) && (
        <Action
          title="Clear Recent History"
          icon={Icon.Clock}
          onAction={async () => {
            if (await confirmAlert({ title: 'Clear Recent History?', message: 'Accounts and favourites are kept.' })) {
              await store.clearRecents();
              await reload();
            }
          }}
        />
      )}
    </ActionPanel.Section>
  );
  const empty = accounts.length
    ? searchText
      ? { title: 'No Matching Accounts', description: 'Try the service name, username or email.' }
      : filter === 'favorites'
        ? { title: 'No Favourites', description: 'Use Add to Favourites on an account to pin it here.' }
        : { title: 'No Recent Accounts', description: 'Accounts appear here after you copy or paste a code.' }
    : { title: 'No Accounts Yet', description: 'Scan a QR code, paste a setup key, or import a backup.' };
  // Moves within the section on screen, so accounts listed in other sections keep their places. `order` is that
  // section's account ids, or undefined when it can't be reordered or a search hides some of its accounts.
  function arrangeActions(account: store.Account, order: string[] | undefined) {
    const index = order?.indexOf(account.id) ?? -1;
    const grid = layout === 'grid';
    const move = (to: number) => async () => {
      if (!order) return;
      await store.setOrder(moveId(order, account.id, to));
      await reload();
    };
    const key = (up: boolean) => (grid ? (up ? 'arrowLeft' : 'arrowRight') : up ? 'arrowUp' : 'arrowDown');
    return (
      <ActionPanel.Section>
        {order && index > 0 && (
          <Action
            title={grid ? 'Move Left' : 'Move up'}
            icon={grid ? Icon.ArrowLeft : Icon.ArrowUp}
            shortcut={{
              macOS: { modifiers: ['cmd', 'opt'], key: key(true) },
              Windows: { modifiers: ['ctrl', 'alt'], key: key(true) },
            }}
            onAction={move(index - 1)}
          />
        )}
        {order && index >= 0 && index < order.length - 1 && (
          <Action
            title={grid ? 'Move Right' : 'Move Down'}
            icon={grid ? Icon.ArrowRight : Icon.ArrowDown}
            shortcut={{
              macOS: { modifiers: ['cmd', 'opt'], key: key(false) },
              Windows: { modifiers: ['ctrl', 'alt'], key: key(false) },
            }}
            onAction={move(index + 1)}
          />
        )}
        {order && index > 0 && (
          <Action
            title="Move to Top"
            icon={Icon.ArrowUpCircle}
            shortcut={{
              macOS: { modifiers: ['cmd', 'opt', 'shift'], key: 'arrowUp' },
              Windows: { modifiers: ['ctrl', 'alt', 'shift'], key: 'arrowUp' },
            }}
            onAction={move(0)}
          />
        )}
        {order && index >= 0 && index < order.length - 1 && (
          <Action
            title="Move to Bottom"
            icon={Icon.ArrowDownCircle}
            shortcut={{
              macOS: { modifiers: ['cmd', 'opt', 'shift'], key: 'arrowDown' },
              Windows: { modifiers: ['ctrl', 'alt', 'shift'], key: 'arrowDown' },
            }}
            onAction={move(order.length - 1)}
          />
        )}
        {accounts.length > 1 && (
          <Action.Push
            title="Rearrange Accounts"
            icon={Icon.Switch}
            shortcut={{
              macOS: { modifiers: ['cmd', 'shift'], key: 'r' },
              Windows: { modifiers: ['ctrl', 'shift'], key: 'r' },
            }}
            target={<RearrangeAccounts accounts={accounts} selected={account.id} onChange={reload} />}
          />
        )}
      </ActionPanel.Section>
    );
  }
  function accountActions(account: store.Account, order: string[] | undefined) {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action
            title={pastePrimary ? 'Paste Code' : 'Copy Code'}
            icon={pastePrimary ? Icon.Clipboard : Icon.CopyClipboard}
            onAction={() => useCode(account, pastePrimary)}
          />
          <Action
            title={pastePrimary ? 'Copy Code' : 'Paste Code'}
            icon={pastePrimary ? Icon.CopyClipboard : Icon.Clipboard}
            onAction={() => useCode(account, !pastePrimary)}
          />
          <Action
            title="Copy Next Code"
            icon={Icon.ArrowRight}
            shortcut={Keyboard.Shortcut.Common.Copy}
            onAction={() => useCode(account, false, true)}
          />
          <Action.CopyToClipboard
            title="Copy Username"
            icon={Icon.Person}
            content={account.name}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
          <Action
            title={account.favorite ? 'Remove from Favourites' : 'Add to Favourites'}
            icon={account.favorite ? Icon.StarDisabled : Icon.Star}
            shortcut={{
              macOS: { modifiers: ['cmd'], key: 'f' },
              Windows: { modifiers: ['ctrl'], key: 'f' },
            }}
            onAction={async () => {
              await store.toggleFavorite(account.id);
              await reload();
            }}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.Push
            title="Edit Account"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={<AccountForm account={account} onSaved={saved} />}
          />
          <Action.Push title="Show Setup QR Code" icon={Icon.Mobile} target={<SetupQrDetail account={account} />} />
          <Action title="Copy Setup URI" icon={Icon.Link} onAction={() => copySetupUri(account)} />
          <Action
            title="Remove Account"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={async () => {
              if (
                await confirmAlert({
                  title: `Remove ${accountLabel(account)}?`,
                  message: 'Make sure you have another way to sign in.',
                  primaryAction: { title: 'Remove', style: Alert.ActionStyle.Destructive },
                })
              ) {
                await store.removeAccount(account.id);
                await reload();
              }
            }}
          />
        </ActionPanel.Section>
        {arrangeActions(account, order)}
        {globalActions}
      </ActionPanel>
    );
  }
  function codeOf(account: store.Account): string | undefined {
    try {
      return formatCode(visible ? generateToken(account, now) : '•'.repeat(account.digits));
    } catch {
      /* One invalid record must not block other accounts. */
    }
  }
  const orderOf = (group: AccountSection) =>
    group.reorderable && !searchText ? group.items.map((account) => account.id) : undefined;
  const remainingOf = (account: store.Account) => account.period - (Math.floor(now / 1000) % account.period);
  const keywords = (account: store.Account) => [account.name, account.issuer ?? '', ...account.name.split(/[@.\s_-]+/)];
  const filterItems: Array<[string, AccountFilter, Icon]> = [
    ['All Accounts', 'all', Icon.Key],
    ['Favourites', 'favorites', Icon.Star],
    ['Recent', 'recent', Icon.Clock],
  ];
  const emptyIcon = accounts.length ? Icon.MagnifyingGlass : Icon.Key;
  const emptyActions = <ActionPanel>{accounts.length ? globalActions : addActions}</ActionPanel>;
  const searchProps = {
    isLoading: loading,
    searchText,
    onSearchTextChange: setSearchText,
    searchBarPlaceholder: 'Search by service or username…',
  };
  if (layout === 'grid') {
    return (
      <Grid
        {...searchProps}
        columns={3}
        aspectRatio="16/9"
        inset={Grid.Inset.Zero}
        searchBarAccessory={
          <Grid.Dropdown tooltip="Filter Accounts" storeValue onChange={(value) => setFilter(value as AccountFilter)}>
            {filterItems.map(([title, value, icon]) => (
              <Grid.Dropdown.Item key={value} title={title} value={value} icon={icon} />
            ))}
          </Grid.Dropdown>
        }
      >
        {!loading && <Grid.EmptyView {...empty} icon={emptyIcon} actions={emptyActions} />}
        {groups.map((group) => (
          <Grid.Section key={group.title} title={group.title} subtitle={String(group.items.length)}>
            {group.items.map((account) => (
              <Grid.Item
                key={account.id}
                id={account.id}
                content={codeTile({
                  title: accountLabel(account),
                  subtitle: account.issuer ? account.name : undefined,
                  favorite: account.favorite,
                  logo: logos[logoUrl(account) ?? ''],
                  initials: initials(account.issuer || account.name),
                  code: codeOf(account),
                  remaining: remainingOf(account),
                  period: account.period,
                })}
                keywords={[accountLabel(account), ...keywords(account)]}
                actions={accountActions(account, orderOf(group))}
              />
            ))}
          </Grid.Section>
        ))}
      </Grid>
    );
  }
  return (
    <List
      {...searchProps}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Accounts" storeValue onChange={(value) => setFilter(value as AccountFilter)}>
          {filterItems.map(([title, value, icon]) => (
            <List.Dropdown.Item key={value} title={title} value={value} icon={icon} />
          ))}
        </List.Dropdown>
      }
    >
      {!loading && <List.EmptyView {...empty} icon={emptyIcon} actions={emptyActions} />}
      {groups.map((group) => (
        <List.Section key={group.title} title={group.title} subtitle={String(group.items.length)}>
          {group.items.map((account) => {
            const remaining = remainingOf(account);
            const code = codeOf(account);
            return (
              <List.Item
                key={account.id}
                id={account.id}
                title={accountLabel(account)}
                subtitle={account.issuer ? account.name : undefined}
                icon={accountIcon(account)}
                keywords={keywords(account)}
                accessories={[
                  ...(filter === 'recent' && account.favorite
                    ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: 'Favourite' }]
                    : []),
                  code
                    ? {
                        text: { value: code, color: Color.PrimaryText },
                        tooltip: `${account.algorithm} · ${account.digits} digits · ${account.period}-second period`,
                      }
                    : { tag: { value: 'Invalid key', color: Color.Red } },
                  {
                    icon: getProgressIcon(remaining / account.period, remaining <= 5 ? Color.Red : Color.Green),
                    text: `${remaining}s`,
                  },
                ]}
                actions={accountActions(account, orderOf(group))}
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
