import {
  ActionPanel,
  List,
  PasteAction,
  Form,
  Icon,
  showToast,
  ToastStyle,
  PushAction,
  Detail,
  getLocalStorageItem,
  setLocalStorageItem,
  SubmitFormAction,
  CopyToClipboardAction,
  ActionPanelChildren,
  removeLocalStorageItem,
  getPreferenceValues,
} from "@raycast/api";
import { Item, Folder } from "./types";
import { useEffect, useState } from "react";
import yaml from "js-yaml";
import execa from "execa";
import { filterNullishPropertiesFromObject, codeBlock } from "./utils";

const { clientId, clientSecret } = getPreferenceValues();

process.env.PATH = "/usr/local/bin";
process.env.BW_CLIENTID = clientId;
process.env.BW_CLIENTSECRET = clientSecret;

function useSessionToken(): [string | null | undefined, (sessionToken: string | null) => void] {
  const [sessionToken, setSessionToken] = useState<string | null>();

  useEffect(() => {
    async function getSessionToken() {
      console.log(process.env.BW_CLIENTID, process.env.BW_CLIENTSECRET);
      console.debug("Get Session Token");
      const sessionToken = await getLocalStorageItem<string>("sessionToken");

      // Check if last session token is still valid
      console.debug("Get Status");
      const { stdout: jsonStatus } = await execa(
        "bw",
        sessionToken ? ["status", "--session", sessionToken] : ["status"]
      );
      const { status } = JSON.parse(jsonStatus);

      if (status === "unlocked") setSessionToken(sessionToken);
      else if (status === "locked") setSessionToken(null);
      else if (status === "unauthenticated") {
        try {
          const toast = await showToast(ToastStyle.Animated, "Login in...", "It may takes some times");
          await execa("bw", ["login", "--apikey"]);
          toast.hide();
          setSessionToken(null);
        } catch (error) {
          showToast(ToastStyle.Failure, "An error occurred during login!", "Please check your crendentials");
        }
      }
    }
    getSessionToken();
  }, []);

  return [
    sessionToken,
    async (sessionToken: string | null) => {
      if (!sessionToken) {
        removeLocalStorageItem("sessionToken");
        setSessionToken(null);
      } else {
        setLocalStorageItem("sessionToken", sessionToken);
        setSessionToken(sessionToken);
      }
    },
  ];
}

export default function ListCommand(): JSX.Element {
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
      const itemPromise = execa("bw", ["list", "items", "--session", sessionToken]).then((res) => res.stdout);
      const folderPromise = execa("bw", ["list", "folders", "--session", sessionToken]).then((res) => res.stdout);
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
                  await execa("bw", ["lock", "--session", sessionToken]);
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
                  await execa("bw", ["sync", "--session", sessionToken]);
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

function UnlockForm(props: { setSessionToken: (session: string) => void }) {
  async function onSubmit(values: { password: string }) {
    try {
      const toast = await showToast(ToastStyle.Animated, "Loading Items...");
      const { stdout: sessionToken } = await execa("bw", ["unlock", values.password, "--raw"]);

      toast.hide();
      props.setSessionToken(sessionToken);
      setLocalStorageItem("sessionToken", sessionToken);
    } catch (error) {
      console.log(error);
      showToast(ToastStyle.Failure, "Wrong Password");
    }
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Unlock" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="password" title="Master password" />
    </Form>
  );
}

function ItemListItem(props: { item: Item; folders: Folder[]; additionalActions?: ActionPanelChildren[] }) {
  const { item, folders, additionalActions } = props;
  const { type, name, notes, identity, login, secureNote, fields, passwordHistory, card } = item;

  const folderMap: Record<string, string> = {};
  for (const folder of folders) {
    if (folder.id) folderMap[folder.id] = folder.name;
  }

  const icon = {
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
