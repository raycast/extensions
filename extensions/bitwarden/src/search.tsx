import {
  ActionPanel,
  List,
  Icon,
  showToast,
  ToastStyle,
  PushAction,
  Detail,
  CopyToClipboardAction,
  ActionPanelChildren,
} from "@raycast/api";
import { Item, Folder } from "./types";
import { useEffect, useState } from "react";
import treeify from "treeify"
import execa from "execa";
import { filterNullishPropertiesFromObject, codeBlock, getWorkflowEnv, checkCliPath } from "./utils";
import { useSessionToken } from "./hooks";
import { TroubleshootingGuide, UnlockForm } from "./components";

export default function ListCommand(): JSX.Element {
  if (!checkCliPath()) {
    return <TroubleshootingGuide />;
  }

  const [sessionToken, setSessionToken] = useSessionToken();

  if (sessionToken === null) return <UnlockForm setSessionToken={setSessionToken} />;

  return <ItemList sessionToken={sessionToken}/>;
}

async function listItems(type: string, sessionToken: string) {
  return execa("bw", ["list", type, "--session", sessionToken], { env: getWorkflowEnv() }).then((res) =>
    JSON.parse(res.stdout)
  );
}

function ItemList(props: { sessionToken: string | undefined }) {
  const { sessionToken } = props;
  const [state, setState] = useState<{ folders: Folder[]; items: Item[] }>();

  const folderMap: Record<string, Folder> = {};
  for (const folder of state?.folders || []) {
    if (folder.id) folderMap[folder.id] = folder;
  }

  async function loadItems(sessionToken: string) {
    try {
      const [items, folders] = await Promise.all([
        listItems("items", sessionToken),
        listItems("folders", sessionToken),
      ]);

      setState({ items, folders });
    } catch (error) {
      showToast(ToastStyle.Failure, "Failed to search vault", "Vault is locked");
    }
  }

  useEffect(() => {
    if (!sessionToken) return;
    loadItems(sessionToken);
  }, [sessionToken]);

  return (
    <List isLoading={typeof state === "undefined"}>
      {state?.items.map((item) => (
        <ItemListItem
          key={item.id}
          item={item}
          folder={item.folderId ? folderMap[item.folderId] : undefined}
          additionalActions={[
            <ActionPanel.Item
              key="sync"
              title="Sync with Remote"
              icon={Icon.ArrowClockwise}
              onAction={async () => {
                if (sessionToken) {
                  const toast = await showToast(ToastStyle.Animated, "Syncing Items...");
                  await execa("bw", ["sync", "--session", sessionToken], { env: getWorkflowEnv() });
                  await loadItems(sessionToken);
                  await toast.hide();
                }
              }}
            />,
          ]}
        />
      ))}
    </List>
  );
}

function ItemListItem(props: { item: Item; folder: Folder | undefined; additionalActions?: ActionPanelChildren[] }) {
  const { item, folder, additionalActions } = props;
  const { type, name, notes, identity, login, secureNote, fields, passwordHistory, card } = item;
  const accessoryIcons = [];
  if (folder) accessoryIcons.push(`📂 ${folder.name}`);
  if (item.favorite) accessoryIcons.push(`⭐️`);

  let icon: string | Icon | undefined;
  if (login?.uris?.[0]?.uri?.startsWith("https"))
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

  const tree = treeify.asTree(cleanItem, true)

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
          <ActionPanel.Section>
            {item.login?.password ? (
              <CopyToClipboardAction title="Copy Password" content={item.login.password} />
            ) : null}
            {item.login?.username ? (
              <CopyToClipboardAction
                title="Copy Username"
                content={item.login?.username}
                shortcut={{ key: "enter", modifiers: ["opt"] }}
              />
            ) : null}
          </ActionPanel.Section>
          {item.notes ? (
            <ActionPanel.Section>
              <PushAction
                title="Show Secure Note"
                icon={Icon.TextDocument}
                target={
                  <Detail
                    markdown={codeBlock(item.notes)}
                    actions={
                      <ActionPanel>
                        <CopyToClipboardAction content={item.notes} />
                      </ActionPanel>
                    }
                  />
                }
              />
              <CopyToClipboardAction title={"Copy Secure Note"} content={item.notes} />
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section>
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
          </ActionPanel.Section>
          <ActionPanel.Section>{additionalActions}</ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
