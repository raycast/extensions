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
} from "@raycast/api";
import { Item, Folder } from "./types";
import { useEffect, useState } from "react";
import treeify from "treeify";
import { filterNullishPropertiesFromObject, codeBlock, titleCase } from "./utils";
import { useSessionToken } from "./hooks";
import { TroubleshootingGuide, UnlockForm } from "./components";
import { existsSync } from "fs";
import { Bitwarden } from "./api";
import { dirname } from "path";

const { cliPath, clientId, clientSecret, fetchFavicons } = getPreferenceValues();
process.env.PATH = dirname(cliPath)
const bitwardenApi = new Bitwarden(clientId, clientSecret);

export default function Search(): JSX.Element {
  if (!existsSync(cliPath)) {
    return <TroubleshootingGuide />;
  }

  const [sessionToken, setSessionToken] = useSessionToken(bitwardenApi);

  if (sessionToken === null) return <UnlockForm setSessionToken={setSessionToken} bitwardenApi={bitwardenApi} />;

  return <ItemList bitwardenApi={bitwardenApi} sessionToken={sessionToken}/>;
}

function ItemList(props: { bitwardenApi: Bitwarden; sessionToken: string | undefined }) {
  const { bitwardenApi, sessionToken } = props;
  const [state, setState] = useState<{ folders: Folder[]; items: Item[] }>();

  const folderMap: Record<string, Folder> = {};
  for (const folder of state?.folders || []) {
    if (folder.id) folderMap[folder.id] = folder;
  }

  async function loadItems(sessionToken: string) {
    try {
      const [items, folders] = await Promise.all([
        bitwardenApi.listItems<Item>("items", sessionToken),
        bitwardenApi.listItems<Folder>("folders", sessionToken),
      ]);

      setState({ items, folders });
    } catch (error) {
      showToast(ToastStyle.Failure, "Failed to search vault", "Vault is locked");
    }
  }

  useEffect(() => {
    if (sessionToken) loadItems(sessionToken);
  }, [sessionToken]);

  return (
    <List isLoading={typeof state === "undefined"}>
      {state?.items.map((item) => (
        <ItemListItem
          key={item.id}
          item={item}
          folder={item.folderId ? folderMap[item.folderId] : undefined}
          refreshItems={async () => {
            if (sessionToken) {
              const toast = await showToast(ToastStyle.Animated, "Syncing Items...");
              await bitwardenApi.sync(sessionToken)
              await loadItems(sessionToken);
              await toast.hide();
            }
          }}
        />
      ))}
    </List>
  );
}

function ItemListItem(props: { item: Item; folder: Folder | undefined; refreshItems?: () => void }) {
  const { item, folder, refreshItems } = props;
  const { type, name, notes, identity, login, secureNote, fields, passwordHistory, card } = item;
  const accessoryIcons = [];
  if (folder) accessoryIcons.push(`📂 ${folder.name}`);
  if (item.favorite) accessoryIcons.push(`⭐️`);

  const fieldMap = Object.fromEntries(fields?.map((field) => [field.name, field.value]) || []);
  const uriMap = Object.fromEntries(
    login?.uris?.filter((uri) => uri.uri).map((uri, index) => [`uri${index + 1}`, uri.uri]) || []
  );

  let icon: string | Icon | undefined;
  if (fetchFavicons && login?.uris?.[0]?.uri?.startsWith("https"))
    icon = `https://s2.googleusercontent.com/s2/favicons?domain_url=${login?.uris?.[0].uri}`;
  else
    icon = {
      1: Icon.Globe,
      2: Icon.TextDocument,
      3: Icon.List,
      4: Icon.Person,
    }[type];

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
      keywords={item.name.split(".")}
      accessoryTitle={accessoryIcons ? accessoryIcons.join("  ") : undefined}
      icon={icon}
      subtitle={item.login?.username || undefined}
      actions={
        <ActionPanel>
          {item.login?.password ? <CopyToClipboardAction title="Copy Password" content={item.login.password} /> : null}
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
              content ? <CopyToClipboardAction key={index} title={titleCase(title)} content={content as string | number} /> : null
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
