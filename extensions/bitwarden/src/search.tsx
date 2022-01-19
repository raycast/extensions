import {
  ActionPanel,
  List,
  Icon,
  showToast,
  ToastStyle,
  PushAction,
  Detail,
  CopyToClipboardAction,
  getPreferenceValues,
  copyTextToClipboard,
  closeMainWindow,
} from "@raycast/api";
import { Item, Folder, VaultStatus } from "./types";
import { useEffect, useState } from "react";
import treeify from "treeify";
import { filterNullishPropertiesFromObject, codeBlock, titleCase, faviconUrl } from "./utils";
import { useBitwarden } from "./hooks";
import { TroubleshootingGuide, UnlockForm } from "./components";
import { Bitwarden } from "./api";

const { fetchFavicons } = getPreferenceValues();

export default function Search(): JSX.Element {
  try {
    const bitwardenApi = new Bitwarden();
    const [state, setSessionToken] = useBitwarden(bitwardenApi);

    if (state.vaultStatus === "locked") {
      return <UnlockForm setSessionToken={setSessionToken} bitwardenApi={bitwardenApi} />;
    }
    return <ItemList bitwardenApi={bitwardenApi} sessionToken={state.sessionToken} vaultStatus={state.vaultStatus} />;
  } catch (error) {
    return <TroubleshootingGuide />;
  }
}

function ItemList(props: {
  bitwardenApi: Bitwarden;
  sessionToken: string | undefined;
  vaultStatus: VaultStatus | undefined;
}) {
  const { bitwardenApi, sessionToken, vaultStatus } = props;
  const [state, setState] = useState<{ folders: Folder[]; items: Item[] }>();

  const folderMap: Record<string, Folder> = {};
  for (const folder of state?.folders || []) {
    if (folder.id) {
      folderMap[folder.id] = folder;
    }
  }

  async function loadItems(sessionToken: string) {
    try {
      const [items, folders] = await Promise.all([
        bitwardenApi.listItems<Item>("items", sessionToken),
        bitwardenApi.listItems<Folder>("folders", sessionToken),
      ]);

      setState({ items, folders });
    } catch (error) {
      showToast(ToastStyle.Failure, "Failed to search vault");
    }
  }

  async function copyTotp(sessionToken: string | undefined, id: string) {
    if (sessionToken) {
      const totp = await bitwardenApi.getTotp(id, sessionToken);
      copyTextToClipboard(totp);
      closeMainWindow({ clearRootSearch: true });
    } else {
      showToast(ToastStyle.Failure, "Failed to fetch TOTP.");
    }
  }

  useEffect(() => {
    if (vaultStatus === "unlocked" && sessionToken) {
      loadItems(sessionToken);
    }
  }, [sessionToken]);

  async function refreshItems() {
    if (sessionToken) {
      const toast = await showToast(ToastStyle.Animated, "Syncing Items...");
      await bitwardenApi.sync(sessionToken);
      await loadItems(sessionToken);
      await toast.hide();
    }
  }

  const favoriteItems = [];
  const regularItems = [];
  for (const item of state?.items || []) {
    item.favorite ? favoriteItems.push(item) : regularItems.push(item);
  }

  return (
    <List isLoading={typeof state === "undefined"}>
      <List.Section title="Favorites">
        {favoriteItems.map((item) => (
          <ItemListItem
            key={item.id}
            item={item}
            folder={item.folderId ? folderMap[item.folderId] : undefined}
            refreshItems={refreshItems}
            sessionToken={sessionToken}
            copyTotp={copyTotp}
          />
        ))}
      </List.Section>
      <List.Section title="Others">
        {regularItems.map((item) => (
          <ItemListItem
            key={item.id}
            item={item}
            folder={item.folderId ? folderMap[item.folderId] : undefined}
            refreshItems={refreshItems}
            sessionToken={sessionToken}
            copyTotp={copyTotp}
          />
        ))}
      </List.Section>
    </List>
  );
}

function getIcon(item: Item) {
  const iconUri = item.login?.uris?.[0]?.uri;
  if (fetchFavicons && iconUri) return faviconUrl(64, iconUri);
  return {
    1: Icon.Globe,
    2: Icon.TextDocument,
    3: Icon.List,
    4: Icon.Person,
  }[item.type];
}

function ItemListItem(props: {
  item: Item;
  folder: Folder | undefined;
  refreshItems?: () => void;
  sessionToken: string | undefined;
  copyTotp: (sessionToken: string | undefined, id: string) => void;
}) {
  const { item, folder, refreshItems, sessionToken, copyTotp } = props;
  const { name, notes, identity, login, secureNote, fields, passwordHistory, card } = item;
  const accessoryIcons = [];

  if (folder) accessoryIcons.push(`📂 ${folder.name}`);
  if (item.favorite) accessoryIcons.push(`⭐️`);
  const fieldMap = Object.fromEntries(fields?.map((field) => [field.name, field.value]) || []);
  const uriMap = Object.fromEntries(
    login?.uris?.filter((uri) => uri.uri).map((uri, index) => [`uri${index + 1}`, uri.uri]) || []
  );

  const cleanItem = filterNullishPropertiesFromObject({
    name,
    notes,
    identity: filterNullishPropertiesFromObject(identity),
    login: filterNullishPropertiesFromObject(login),
    card: filterNullishPropertiesFromObject(card),
    secureNote,
    fields,
    folder: folder?.name,
    passwordHistory,
  });

  const tree = treeify.asTree(cleanItem, true, false);

  return (
    <List.Item
      id={item.id}
      title={item.name}
      keywords={item.name.split(/\W/)}
      accessoryTitle={accessoryIcons ? accessoryIcons.join("  ") : undefined}
      icon={getIcon(item)}
      subtitle={item.login?.username || undefined}
      actions={
        <ActionPanel>
          {item.login?.password ? <CopyToClipboardAction title="Copy Password" content={item.login.password} /> : null}
          {item.login?.totp ? (
            <ActionPanel.Item
              title="Copy TOTP"
              icon={Icon.Clipboard}
              onAction={() => copyTotp(sessionToken, item.id)}
            />
          ) : null}
          {item.notes ? (
            <PushAction
              title="Show Secure Note"
              icon={Icon.TextDocument}
              target={
                <Detail
                  markdown={codeBlock(item.notes)}
                  actions={
                    <ActionPanel>
                      <CopyToClipboardAction title="Copy Secure Notes" content={item.notes} />
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
              folder: folder?.name,
              notes,
              ...card,
              ...identity,
              ...fieldMap,
              ...uriMap,
            }).map(([title, content], index) =>
              content ? (
                <CopyToClipboardAction key={index} title={titleCase(title)} content={content as string | number} />
              ) : null
            )}
          </ActionPanel.Submenu>
          <PushAction
            title={"Show Details"}
            icon={Icon.Text}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            target={
              <Detail
                markdown={codeBlock(tree)}
                actions={
                  <ActionPanel>
                    <CopyToClipboardAction content={tree} />
                  </ActionPanel>
                }
              />
            }
          />
          <ActionPanel.Item
            title="Refresh Items"
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            icon={Icon.ArrowClockwise}
            onAction={refreshItems}
          />
        </ActionPanel>
      }
    />
  );
}
