import {
  ActionPanel,
  List,
  Icon,
  showToast,
  Detail,
  getPreferenceValues,
  closeMainWindow,
  Color,
  Toast,
  Clipboard,
  Action,
  LocalStorage,
} from "@raycast/api";
import { Item } from "./types";
import { Fragment, useEffect, useMemo, useState } from "react";
import { codeBlock, titleCase, faviconUrl, extractKeywords } from "./utils";
import { Bitwarden } from "./api";
import { SESSION_KEY } from "./const";
import { TroubleshootingGuide, UnlockForm } from "./components";

const { fetchFavicons, primaryAction } = getPreferenceValues();

function useSession() {
  const [state, setState] = useState<{ isLoading: boolean; token?: string }>({ isLoading: true });

  useEffect(() => {
    LocalStorage.getItem<string>(SESSION_KEY).then((token) => setState({ isLoading: false, token }));
  }, []);

  return {
    token: state.token,
    active: !state.isLoading,
    setToken: async (token: string) => {
      await LocalStorage.setItem(SESSION_KEY, token);
      setState({ isLoading: false, token });
    },
    deleteToken: async () => {
      await LocalStorage.removeItem(SESSION_KEY);
      setState({ isLoading: false });
    },
  };
}

export default function Search() {
  try {
    const api = new Bitwarden();
    return <ItemList api={api} />;
  } catch (e) {
    return <TroubleshootingGuide />;
  }
}

export function ItemList(props: { api: Bitwarden }) {
  const bitwardenApi = props.api;
  const session = useSession();
  const [state, setState] = useState<{ items: Item[]; isLocked: boolean; isLoading: boolean }>({
    items: [],
    isLocked: false,
    isLoading: true,
  });

  async function loadItems(sessionToken: string) {
    try {
      const items = await bitwardenApi.listItems(sessionToken);
      setState((previous) => ({ ...previous, isLoading: false, items }));
    } catch (error) {
      setState((previous) => ({ ...previous, isLocked: true }));
    }
  }

  async function copyTotp(id: string) {
    if (session.token) {
      const toast = await showToast(Toast.Style.Success, "Copying TOTP Code...");
      const totp = await bitwardenApi.getTotp(id, session.token);
      await Clipboard.copy(totp);
      await toast.hide();
      await closeMainWindow({ clearRootSearch: true });
    } else {
      showToast(Toast.Style.Failure, "Failed to fetch TOTP.");
    }
  }

  useEffect(() => {
    const token = session.token;
    if (!session.active) {
      return;
    }
    if (!token) {
      setState((previous) => ({ ...previous, isLocked: true }));
    } else {
      loadItems(token);
    }
  }, [session.token, session.active]);

  async function syncItems() {
    if (session.token) {
      const toast = await showToast(Toast.Style.Animated, "Syncing Items...");
      try {
        await bitwardenApi.sync(session.token);
        await loadItems(session.token);
        await toast.hide();
      } catch (error) {
        await bitwardenApi.logout();
        await session.deleteToken();
        toast.style = Toast.Style.Failure;
        toast.message = "Failed to sync. Please try logging in again.";
      }
    }
  }

  async function lockVault() {
    const toast = await showToast({ title: "Locking Vault...", style: Toast.Style.Animated });
    await bitwardenApi.lock();
    await session.deleteToken();
    await toast.hide();
  }

  async function logoutVault() {
    const toast = await showToast({ title: "Logging Out...", style: Toast.Style.Animated });
    await bitwardenApi.logout();
    await session.deleteToken();
    await toast.hide();
  }

  if (state.isLocked) {
    return (
      <UnlockForm
        bitwardenApi={bitwardenApi}
        onUnlock={async (token) => {
          await session.setToken(token);
          setState((previous) => ({ ...previous, isLocked: false }));
        }}
      />
    );
  }

  const vaultEmpty = state.items.length == 0;

  return (
    <List isLoading={state.isLoading}>
      {state.items
        .sort((a, b) => {
          if (a.favorite && b.favorite) return 0;
          return a.favorite ? -1 : 1;
        })
        .map((item) => (
          <BitwardenItem
            key={item.id}
            item={item}
            lockVault={lockVault}
            logoutVault={logoutVault}
            syncItems={syncItems}
            copyTotp={copyTotp}
          />
        ))}
      {state.isLoading ? (
        <List.EmptyView icon={Icon.TwoArrowsClockwise} title="Loading..." description="Please wait." />
      ) : (
        <List.EmptyView
          icon={{ source: "bitwarden-64.png" }}
          title={vaultEmpty ? "Vault empty." : "No matching items found."}
          description={
            vaultEmpty
              ? "Hit the sync button to sync your vault or try logging in again."
              : "Hit the sync button to sync your vault."
          }
          actions={
            !state.isLoading && (
              <ActionPanel>
                <VaultActions syncItems={syncItems} lockVault={lockVault} logoutVault={logoutVault} />
              </ActionPanel>
            )
          }
        />
      )}
    </List>
  );
}

function getIcon(item: Item) {
  const iconUri = item.login?.uris?.[0]?.uri;
  if (fetchFavicons && iconUri) return faviconUrl(iconUri);
  return {
    1: Icon.Globe,
    2: Icon.TextDocument,
    3: Icon.List,
    4: Icon.Person,
  }[item.type];
}

function BitwardenItem(props: {
  item: Item;
  syncItems: () => void;
  lockVault: () => void;
  logoutVault: () => void;
  copyTotp: (id: string) => void;
}) {
  const { item, syncItems, lockVault, logoutVault, copyTotp } = props;
  const { notes, identity, login, fields, card } = item;

  const keywords = useMemo(() => extractKeywords(item), [item]);

  const fieldMap = Object.fromEntries(fields?.map((field) => [field.name, field.value]) || []);
  const uriMap = Object.fromEntries(
    login?.uris?.filter((uri) => uri.uri).map((uri, index) => [`uri${index + 1}`, uri.uri]) || []
  );

  return (
    <List.Item
      id={item.id}
      title={item.name}
      keywords={keywords}
      accessories={
        item.favorite ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Favorite" }] : undefined
      }
      icon={getIcon(item)}
      subtitle={item.login?.username || undefined}
      actions={
        <ActionPanel>
          {login ? (
            <ActionPanel.Section>
              {login.password ? <PasswordActions password={login.password} /> : null}
              {login.totp ? (
                <Action
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                  title="Copy TOTP"
                  icon={Icon.Clipboard}
                  onAction={async () => {
                    await copyTotp(item.id);
                  }}
                />
              ) : null}
              {login.username ? (
                <Action.CopyToClipboard
                  title="Copy Username"
                  content={login.username}
                  icon={Icon.Person}
                  shortcut={{ modifiers: ["cmd"], key: "u" }}
                />
              ) : null}
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section>
            {notes ? (
              <Action.Push
                title="Show Secure Note"
                icon={Icon.TextDocument}
                target={
                  <Detail
                    markdown={codeBlock(notes)}
                    actions={
                      <ActionPanel>
                        <Action.CopyToClipboard title="Copy Secure Notes" content={notes} />
                      </ActionPanel>
                    }
                  />
                }
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {Object.entries({
              notes,
              ...card,
              ...identity,
              ...fieldMap,
              ...uriMap,
            }).map(([title, content], index) =>
              content ? (
                <Action.CopyToClipboard
                  key={index}
                  title={`Copy ${titleCase(title)}`}
                  content={content as string | number}
                />
              ) : null
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <VaultActions syncItems={syncItems} lockVault={lockVault} logoutVault={logoutVault} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function PasswordActions(props: { password: string }) {
  const copyAction = <Action.CopyToClipboard key="copy" title="Copy Password" content={props.password} />;
  const pasteAction = <Action.Paste key="paste" title="Paste Password" content={props.password} />;

  return <Fragment>{primaryAction == "copy" ? [copyAction, pasteAction] : [pasteAction, copyAction]}</Fragment>;
}

function VaultActions(props: { syncItems: () => void; lockVault: () => void; logoutVault: () => void }) {
  return (
    <Fragment>
      <Action
        title="Sync Vault"
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        icon={Icon.ArrowClockwise}
        onAction={props.syncItems}
      />
      <Action
        icon={{ source: "sf_symbols_lock.svg", tintColor: Color.PrimaryText }} // Does not immediately follow theme
        title="Lock Vault"
        shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        onAction={props.lockVault}
      />
      <Action title="Logout" icon={Icon.XmarkCircle} onAction={props.logoutVault} />
    </Fragment>
  );
}
