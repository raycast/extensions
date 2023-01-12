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
import { Item, VaultStatus } from "./types";
import React, { useEffect, useState } from "react";
import treeify from "treeify";
import { filterNullishPropertiesFromObject, codeBlock, titleCase, faviconUrl } from "./utils";
import { useBitwarden } from "./hooks";
import { TroubleshootingGuide, UnlockForm } from "./components";
import { Bitwarden } from "./api";

const { fetchFavicons, primaryAction } = getPreferenceValues();

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
  const [items, setItems] = useState<Item[]>();

  async function loadItems(sessionToken: string) {
    try {
      const items = await bitwardenApi.listItems<Item>("items", sessionToken);
      setItems(items);
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to search vault");
    }
  }

  async function copyTotp(sessionToken: string | undefined, id: string) {
    if (sessionToken) {
      const totp = await bitwardenApi.getTotp(id, sessionToken);
      Clipboard.copy(totp);
      closeMainWindow({ clearRootSearch: true });
    } else {
      showToast(Toast.Style.Failure, "Failed to fetch TOTP.");
    }
  }

  useEffect(() => {
    if (vaultStatus === "unlocked" && sessionToken) {
      loadItems(sessionToken);
    }
  }, [sessionToken]);

  async function refreshItems() {
    if (sessionToken) {
      const toast = await showToast(Toast.Style.Animated, "Syncing Items...");
      await bitwardenApi.sync(sessionToken);
      await loadItems(sessionToken);
      await toast.hide();
    }
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
              <ItemListItem
                key={item.id}
                item={item}
                refreshItems={refreshItems}
                sessionToken={sessionToken}
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

function ItemListItem(props: {
  item: Item;
  refreshItems?: () => void;
  sessionToken: string | undefined;
  copyTotp: (sessionToken: string | undefined, id: string) => void;
}) {
  const { item, refreshItems, sessionToken, copyTotp } = props;
  const { name, notes, identity, login, secureNote, fields, passwordHistory, card } = item;

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
    passwordHistory,
  });

  const tree = treeify.asTree(cleanItem, true, false);

  return (
    <List.Item
      id={item.id}
      title={item.name}
      keywords={item.name.split(/\W/)}
      accessoryIcon={item.favorite ? { source: Icon.Star, tintColor: Color.Yellow } : undefined}
      icon={getIcon(item)}
      subtitle={item.login?.username || undefined}
      actions={
        <ActionPanel>
          {item.login?.password ? <PasswordActions password={item.login.password} /> : null}
          {item.login?.totp ? (
            <ActionPanel.Item
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              title="Copy TOTP"
              icon={Icon.Clipboard}
              onAction={() => copyTotp(sessionToken, item.id)}
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
                <Action.CopyToClipboard key={index} title={titleCase(title)} content={content as string | number} />
              ) : null
            )}
          </ActionPanel.Submenu>
          <Action.Push
            title={"Show Details"}
            icon={Icon.Text}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            target={
              <Detail
                markdown={codeBlock(tree)}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard content={tree} />
                  </ActionPanel>
                }
              />
            }
          />
          <Action
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

function PasswordActions(props: { password: string }) {
  const copyAction = <Action.CopyToClipboard key="copy" title="Copy Password" content={props.password} />;
  const pasteAction = <Action.Paste key="paste" title="Paste Password" content={props.password} />;

  return (
    <React.Fragment>{primaryAction == "copy" ? [copyAction, pasteAction] : [pasteAction, copyAction]}</React.Fragment>
  );
}
