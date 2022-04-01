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
  popToRoot,
} from "@raycast/api";
import { Item } from "./types";
import React, { useEffect, useMemo, useState } from "react";
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
  const { cliPath, clientId, clientSecret } = getPreferenceValues();
  try {
    const api = new Bitwarden(clientId, clientSecret, cliPath);
    return <ItemList api={api} />;
  } catch (e) {
    return <TroubleshootingGuide />;
  }
}

export function ItemList(props: { api: Bitwarden }) {
  const bitwardenApi = props.api;
  const session = useSession();
  const [locked, setLocked] = useState(false);
  const [items, setItems] = useState<Item[]>();

  async function loadItems(sessionToken: string) {
    try {
      const items = await bitwardenApi.listItems(sessionToken);
      setItems(items);
    } catch (error) {
      setLocked(true);
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
      setLocked(true);
    } else {
      loadItems(token);
    }
  }, [session.token, session.active]);

  async function refreshItems() {
    if (session.token) {
      const toast = await showToast(Toast.Style.Animated, "Syncing Items...");
      await bitwardenApi.sync(session.token);
      await loadItems(session.token);
      await toast.hide();
    }
  }

  if (locked) {
    return (
      <UnlockForm
        bitwardenApi={bitwardenApi}
        onUnlock={async (token) => {
          await session.setToken(token);
          await setLocked(false);
        }}
      />
    );
  }

  return (
    <List isLoading={typeof items === "undefined"}>
      {items
        ? items
            .sort((a, b) => {
              if (a.favorite && b.favorite) return 0;
              return a.favorite ? -1 : 1;
            })
            .map((item) => (
              <BitwardenItem
                key={item.id}
                item={item}
                lockVault={async () => {
                  await bitwardenApi.lock();
                  await session.deleteToken();
                }}
                refreshItems={refreshItems}
                copyTotp={copyTotp}
              />
            ))
        : null}
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
  refreshItems?: () => void;
  lockVault: () => void;
  copyTotp: (id: string) => void;
}) {
  const { item, refreshItems, copyTotp, lockVault } = props;
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
      accessoryIcon={item.favorite ? { source: Icon.Star, tintColor: Color.Yellow } : undefined}
      icon={getIcon(item)}
      subtitle={item.login?.username || undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {item.login?.password ? <PasswordActions password={item.login.password} /> : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {item.login?.username ? (
              <Action.CopyToClipboard
                title="Copy Username"
                content={item.login.username}
                icon={Icon.Person}
                shortcut={{ modifiers: ["cmd"], key: "u" }}
                onCopy={exit}
              />
            ) : null}
            {item.login?.totp ? (
              <Action
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                title="Copy TOTP"
                icon={Icon.Clipboard}
                onAction={async () => {
                  await copyTotp(item.id);
                  await exit();
                }}
              />
            ) : null}
            {item.notes ? (
              <Action.Push
                title="Show Secure Note"
                icon={Icon.TextDocument}
                target={
                  <Detail
                    markdown={codeBlock(item.notes)}
                    actions={
                      <ActionPanel>
                        <Action.CopyToClipboard title="Copy Secure Notes" content={item.notes} />
                      </ActionPanel>
                    }
                  />
                }
              />
            ) : null}
            <ActionPanel.Submenu
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              icon={Icon.Clipboard}
              title="Copy Property"
            >
              {Object.entries({
                username: login?.username,
                notes,
                ...card,
                ...identity,
                ...fieldMap,
                ...uriMap,
              }).map(([title, content], index) =>
                content ? (
                  <Action.CopyToClipboard
                    key={index}
                    title={titleCase(title)}
                    content={content as string | number}
                    onCopy={exit}
                  />
                ) : null
              )}
            </ActionPanel.Submenu>
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh Items"
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              icon={Icon.ArrowClockwise}
              onAction={refreshItems}
            />
            <Action icon={Icon.XmarkCircle} title="Lock Vault" onAction={lockVault} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function PasswordActions(props: { password: string }) {
  const copyAction = <Action.CopyToClipboard key="copy" title="Copy Password" content={props.password} onCopy={exit} />;
  const pasteAction = <Action.Paste key="paste" title="Paste Password" content={props.password} onPaste={exit} />;

  return (
    <React.Fragment>{primaryAction == "copy" ? [copyAction, pasteAction] : [pasteAction, copyAction]}</React.Fragment>
  );
}

async function exit() {
  await closeMainWindow();
  await popToRoot();
}
