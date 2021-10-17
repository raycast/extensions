import {
  ActionPanel,
  List,
  PasteAction,
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
import yaml from "js-yaml";
import execa from "execa";
import { filterNullishPropertiesFromObject, codeBlock, getWorkflowEnv, checkCliPath } from "./utils";
import { useSessionToken } from "./hooks";
import { TroubleshootingGuide, UnlockForm } from "./components";

export default function ListCommand(): JSX.Element {
  if (!checkCliPath()) {
    return <TroubleshootingGuide/>
  }

  const [sessionToken, setSessionToken] = useSessionToken();

  if (sessionToken === undefined) return <Detail isLoading={true} />;
  else if (sessionToken === null) return <UnlockForm setSessionToken={setSessionToken} />;

  return <ItemList sessionToken={sessionToken} setSessionToken={setSessionToken} />;
}

function ItemList(props: { sessionToken: string; setSessionToken: (sessionToken: string | null) => void }) {
  const { sessionToken, setSessionToken } = props;
  const [state, setState] = useState<{ folders: Folder[]; items: Item[] }>();

  async function loadItems(sessionToken: string) {
    try {
      console.debug("Get Items");
      const itemPromise = execa("bw", ["list", "items", "--session", sessionToken], { env: getWorkflowEnv() }).then(
        (res) => res.stdout
      );
      const folderPromise = execa("bw", ["list", "folders", "--session", sessionToken], { env: getWorkflowEnv() }).then(
        (res) => res.stdout
      );
      const [itemString, folderString] = await Promise.all([itemPromise, folderPromise]);
      const items = JSON.parse(itemString);
      const folders = JSON.parse(folderString);
      console.debug(`Loaded ${items.length} Items`);
      setState({ items, folders });
    } catch (error) {
      showToast(ToastStyle.Failure, "Expired Session!");
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
          folders={state.folders}
          additionalActions={[
            <ActionPanel.Item
              key="lock"
              title="Lock Vault"
              icon={Icon.Upload}
              onAction={async () => {
                if (sessionToken) {
                  await execa("bw", ["lock", "--session", sessionToken], { env: getWorkflowEnv() });
                  setSessionToken(null);
                }
              }}
            />,
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

function ItemListItem(props: { item: Item; folders: Folder[]; additionalActions?: ActionPanelChildren[] }) {
  const { item, folders, additionalActions } = props;
  const { type, name, notes, identity, login, secureNote, fields, passwordHistory, card } = item;

  const folderMap: Record<string, string> = {};
  for (const folder of folders) {
    if (folder.id) folderMap[folder.id] = folder.name;
  }

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
    passwordHistory,
  });

  return (
    <List.Item
      id={item.id}
      title={item.name}
      keywords={item.name.split(".")}
      accessoryIcon={item.favorite ? Icon.Star : undefined}
      icon={icon}
      subtitle={item.login?.username || undefined}
      actions={
        <ActionPanel>
          {item.login?.password ? (
            <ActionPanel.Section>
              <CopyToClipboardAction title="Copy Password" content={item.login?.password} />
              <PasteAction title="Paste Password" content={item.login?.password} />
            </ActionPanel.Section>
          ) : null}
          {item.login?.username ? (
            <ActionPanel.Section>
              <CopyToClipboardAction
                title="Copy Username"
                content={item.login?.username}
                shortcut={{ key: "enter", modifiers: ["opt"] }}
              />
              <PasteAction
                title="Paste Username"
                content={item.login?.username}
                shortcut={{ key: "enter", modifiers: ["cmd", "opt"] }}
              />
            </ActionPanel.Section>
          ) : null}
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
                  markdown={codeBlock(yaml.dump(cleanItem, { indent: 2 }))}
                  actions={
                    <ActionPanel>
                      <CopyToClipboardAction content={yaml.dump(cleanItem, { indent: 2 })} />
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
