import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from '@raycast/api';
import { useState } from 'react';
import { accountIcon } from './account-icon';
import { Account, accountLabel, moveId } from './model';
import * as store from './store';

type Props = { accounts: Account[]; selected?: string; onChange: () => Promise<void> };

// Reordering in the spirit of Microsoft Authenticator's drag and drop, by keyboard: ↵ picks an account up, the arrow
// keys (or the search) find its new place, and ↵ puts it there. Favourites and other accounts are ordered separately,
// as the account list shows them separately.
export function RearrangeAccounts({ accounts, selected: initial, onChange }: Props) {
  const [favourites, setFavourites] = useState(() => accounts.filter((a) => a.favorite).map((a) => a.id));
  const [others, setOthers] = useState(() => accounts.filter((a) => !a.favorite).map((a) => a.id));
  const [selected, setSelected] = useState(initial);
  const [carried, setCarried] = useState<string>();
  const byId = new Map(accounts.map((account) => [account.id, account]));
  const sections = [
    { title: 'Favourites', ids: favourites, set: setFavourites },
    { title: 'Accounts', ids: others, set: setOthers },
  ];

  async function place(id: string, ids: string[], set: (ids: string[]) => void, to: number) {
    const order = moveId(ids, id, to);
    set(order);
    setCarried(undefined);
    setSelected(id);
    try {
      await store.setOrder(order);
      await onChange();
    } catch {
      set(ids);
      await showToast({ style: Toast.Style.Failure, title: 'Could not save the new order' });
    }
  }

  const moving = carried ? byId.get(carried) : undefined;
  return (
    <List
      navigationTitle="Rearrange Accounts"
      searchBarPlaceholder={
        moving ? `Moving ${accountLabel(moving)}: choose its new place and press ↵` : 'Press ↵ on an account to move it'
      }
      selectedItemId={selected}
      onSelectionChange={(id) => id && setSelected(id)}
    >
      {sections
        .filter(({ ids }) => ids.length)
        .map(({ title, ids, set }) => (
          <List.Section key={title} title={title} subtitle={String(ids.length)}>
            {ids.map((id, index) => {
              const account = byId.get(id);
              if (!account) return null;
              const isCarried = id === carried;
              const sameSection = carried !== undefined && ids.includes(carried);
              const step = (to: number) => () => place(id, ids, set, to);
              return (
                <List.Item
                  key={id}
                  id={id}
                  title={accountLabel(account)}
                  subtitle={account.issuer ? account.name : undefined}
                  icon={accountIcon(account)}
                  keywords={[account.name, account.issuer ?? '']}
                  accessories={[
                    ...(isCarried ? [{ tag: { value: 'Moving', color: Color.Blue } }] : []),
                    { text: String(index + 1), tooltip: 'Position' },
                  ]}
                  actions={
                    <ActionPanel>
                      {!carried && <Action title="Pick up" icon={Icon.Move} onAction={() => setCarried(id)} />}
                      {moving && carried && !isCarried && sameSection && (
                        <Action
                          title={`Move ${accountLabel(moving)} Here`}
                          icon={Icon.Checkmark}
                          onAction={() => place(carried, ids, set, index)}
                        />
                      )}
                      {carried && (
                        <Action
                          title={isCarried ? 'Put Down' : 'Cancel Move'}
                          icon={Icon.XMarkCircle}
                          onAction={() => setCarried(undefined)}
                        />
                      )}
                      {!carried && (
                        <ActionPanel.Section>
                          {index > 0 && (
                            <Action
                              title="Move up"
                              icon={Icon.ArrowUp}
                              shortcut={{
                                macOS: { modifiers: ['cmd', 'opt'], key: 'arrowUp' },
                                Windows: { modifiers: ['ctrl', 'alt'], key: 'arrowUp' },
                              }}
                              onAction={step(index - 1)}
                            />
                          )}
                          {index < ids.length - 1 && (
                            <Action
                              title="Move Down"
                              icon={Icon.ArrowDown}
                              shortcut={{
                                macOS: { modifiers: ['cmd', 'opt'], key: 'arrowDown' },
                                Windows: { modifiers: ['ctrl', 'alt'], key: 'arrowDown' },
                              }}
                              onAction={step(index + 1)}
                            />
                          )}
                          {index > 0 && (
                            <Action
                              title="Move to Top"
                              icon={Icon.ArrowUpCircle}
                              shortcut={{
                                macOS: { modifiers: ['cmd', 'opt', 'shift'], key: 'arrowUp' },
                                Windows: { modifiers: ['ctrl', 'alt', 'shift'], key: 'arrowUp' },
                              }}
                              onAction={step(0)}
                            />
                          )}
                          {index < ids.length - 1 && (
                            <Action
                              title="Move to Bottom"
                              icon={Icon.ArrowDownCircle}
                              shortcut={{
                                macOS: { modifiers: ['cmd', 'opt', 'shift'], key: 'arrowDown' },
                                Windows: { modifiers: ['ctrl', 'alt', 'shift'], key: 'arrowDown' },
                              }}
                              onAction={step(ids.length - 1)}
                            />
                          )}
                        </ActionPanel.Section>
                      )}
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        ))}
    </List>
  );
}
