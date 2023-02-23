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
} from "@raycast/api";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Bitwarden } from "~/api/bitwarden";
import { CopyPasswordAction } from "~/components/CopyPasswordAction";
import { PastePasswordAction } from "~/components/PastePasswordAction";
import { TroubleshootingGuide } from "~/components/TroubleshootingGuide";
import { SessionProvider, useSession } from "~/context/session";
import { Folder, Item, Reprompt } from "~/types/search";
import { extractKeywords, faviconUrl } from "~/utils/search";
import { capitalize, codeBlock } from "~/utils/strings";

const { fetchFavicons, primaryAction } = getPreferenceValues();

export default function Search() {
  try {
    const api = new Bitwarden();
    return (
      <SessionProvider api={api} unlock>
        <ItemList api={api} />
      </SessionProvider>
    );
  } catch (e) {
    return <TroubleshootingGuide />;
  }
}

export function ItemList(props: { api: Bitwarden }) {
  const bitwardenApi = props.api;
  const session = useSession();
  const [state, setState] = useState<{ items: Item[]; folders: Folder[]; isLoading: boolean }>({
    items: [],
    folders: [],
    isLoading: true,
  });

  async function loadItems(sessionToken: string) {
    try {
      const [folders, items] = await Promise.all([
        bitwardenApi.listFolders(sessionToken),
        bitwardenApi.listItems(sessionToken),
      ]);

      setState((previous) => ({ ...previous, isLoading: false, items, folders }));
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to load vault.");
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
        await session.logout();
        toast.style = Toast.Style.Failure;
        toast.message = "Failed to sync. Please try logging in again.";
      }
    }
  }

  const vaultEmpty = state.items.length == 0;
  const vaultLoading = session.isLoading || state.isLoading;

  return (
    <List isLoading={vaultLoading}>
      {state.items
        .sort((a, b) => {
          if (a.favorite && b.favorite) return 0;
          return a.favorite ? -1 : 1;
        })
        .map((item) => {
          const folder = state.folders.find((f) => f.id === item.folderId);

          return (
            <BitwardenItem
              key={item.id}
              item={item}
              folder={folder}
              lockVault={session.lock}
              logoutVault={session.logout}
              syncItems={syncItems}
              copyTotp={copyTotp}
            />
          );
        })}
      {vaultLoading ? (
        <List.EmptyView icon={Icon.ArrowClockwise} title="Loading..." description="Please wait." />
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
                <VaultActions syncItems={syncItems} lockVault={session.lock} logoutVault={session.logout} />
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
    2: Icon.BlankDocument,
    3: Icon.List,
    4: Icon.Person,
  }[item.type];
}

function BitwardenItem(props: {
  item: Item;
  folder: Folder | undefined;
  syncItems: () => void;
  lockVault: () => void;
  logoutVault: () => void;
  copyTotp: (id: string) => void;
}) {
  const { item, folder, syncItems, lockVault, logoutVault, copyTotp } = props;
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
      accessories={getAccessories(item, folder)}
      icon={getIcon(item)}
      subtitle={item.login?.username || undefined}
      actions={
        <ActionPanel>
          {login ? (
            <ActionPanel.Section>
              {login.password ? <PasswordActions password={login.password} item={item} /> : null}
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
                icon={Icon.BlankDocument}
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
                  title={`Copy ${capitalize(title)}`}
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

function getAccessories(item: Item, folder: Folder | undefined) {
  const accessories = [];

  if (folder?.id) {
    accessories.push({
      icon: { source: Icon.Folder, tintColor: Color.SecondaryText },
      tooltip: "Folder",
      text: folder.name,
    });
  }

  if (item.favorite) {
    accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Favorite" });
  }

  return accessories;
}

function PasswordActions(props: { password: string; item: Item }) {
  const session = useSession();
  const { password, item } = props;
  const actionProps = {
    item,
    session,
    reprompt: item.reprompt === Reprompt.REQUIRED,
  };

  const copyAction = <CopyPasswordAction key="copy" content={password} {...actionProps} />;
  const pasteAction = <PastePasswordAction key="paste" content={props.password} {...actionProps} />;

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
      <Action title="Logout" icon={Icon.XMarkCircle} onAction={props.logoutVault} />
    </Fragment>
  );
}
