import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  getPreferenceValues,
  Icon,
  List,
  LocalStorage,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { type Connection, sshCommand } from "./model";
import { connect, type Terminal } from "./terminal";
import {
  readConfigHosts,
  getConfigFields,
  getConfigDisplay,
  getPresentation,
  setHostEmoji,
  getAdvancedOptions,
  saveAdvancedOptions,
  advancedNames,
  type AdvancedOptions,
  saveConfigFields,
  deleteConfigHost,
  type ConfigFields,
} from "./ssh-config";

const STORAGE_KEY = "connections-v1";

function ConfigForm({
  initial,
  originalAlias,
  onSaved,
}: {
  initial?: ConfigFields;
  originalAlias?: string;
  onSaved: () => void;
}) {
  const { pop } = useNavigation();
  let conditional = false;
  try {
    conditional =
      !!originalAlias && getConfigDisplay(originalAlias).conditional;
  } catch {
    /* The form remains usable. */
  }
  async function submit(values: ConfigFields) {
    try {
      const fields = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, value.trim()]),
      ) as unknown as ConfigFields;
      if (
        originalAlias &&
        JSON.stringify(getConfigFields(originalAlias)) !==
          JSON.stringify(initial)
      )
        throw new Error(
          "This connection changed while the form was open. Refresh and try again.",
        );
      saveConfigFields(fields, originalAlias);
      onSaved();
      pop();
      await showToast({
        style: Toast.Style.Success,
        title: originalAlias
          ? "SSH config updated"
          : "Connection added to SSH config",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save SSH config",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return (
    <Form
      navigationTitle={
        originalAlias ? `Edit · ${originalAlias}` : "New SSH Connection"
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save to SSH Config" onSubmit={submit} />
        </ActionPanel>
      }
    >
      {conditional && (
        <Form.Description text="This host has conditional SSH rules. Changes here affect its Host block; earlier Match rules may override them when connecting." />
      )}
      <Form.TextField
        id="alias"
        title="SSH Alias"
        placeholder="production"
        defaultValue={initial?.alias}
        info="The name used in ssh commands; no spaces or wildcards."
      />
      <Form.TextField
        id="host"
        title="HostName"
        placeholder="Optional; defaults to the SSH alias"
        defaultValue={initial?.host}
      />
      <Form.TextField
        id="user"
        title="User"
        placeholder="Optional"
        defaultValue={initial?.user}
      />
      <Form.TextField
        id="port"
        title="Port"
        placeholder="Optional"
        defaultValue={initial?.port}
      />
      <Form.TextField
        id="identityFile"
        title="Identity File"
        placeholder="Optional, e.g. ~/.ssh/id_ed25519"
        defaultValue={initial?.identityFile}
      />
    </Form>
  );
}

function ConfigEditor({
  alias,
  onSaved,
}: {
  alias: string;
  onSaved: () => void;
}) {
  try {
    return (
      <ConfigForm
        initial={getConfigFields(alias)}
        originalAlias={alias}
        onSaved={onSaved}
      />
    );
  } catch (error) {
    return (
      <List>
        <List.EmptyView
          title="Cannot edit this host safely"
          description={error instanceof Error ? error.message : String(error)}
        />
      </List>
    );
  }
}

function EmojiForm({
  alias,
  initial,
  onSaved,
}: {
  alias: string;
  initial: string;
  onSaved: () => void;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={`Icon · ${alias}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Icon"
            onSubmit={async (values: { emoji: string }) => {
              try {
                setHostEmoji(alias, values.emoji);
                onSaved();
                pop();
                await showToast({
                  style: Toast.Style.Success,
                  title: "Icon saved",
                });
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not save icon",
                  message:
                    error instanceof Error ? error.message : String(error),
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Choose an emoji for this Host block. A shared block uses the same icon for all its aliases." />
      <Form.TextField
        id="emoji"
        title="Emoji"
        placeholder="e.g. 🖥️ — leave empty to use the SSH Config Editor icon"
        defaultValue={initial}
      />
    </Form>
  );
}

function AdvancedEditor({
  alias,
  onSaved,
}: {
  alias: string;
  onSaved: () => void;
}) {
  const { pop } = useNavigation();
  let initial: AdvancedOptions;
  try {
    initial = getAdvancedOptions(alias);
  } catch (error) {
    return (
      <List>
        <List.EmptyView
          title="Cannot edit these options safely"
          description={error instanceof Error ? error.message : String(error)}
        />
      </List>
    );
  }
  return (
    <Form
      navigationTitle={`SSH Options · ${alias}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save SSH Options"
            onSubmit={async (values: AdvancedOptions) => {
              try {
                saveAdvancedOptions(alias, values, initial);
                onSaved();
                pop();
                await showToast({
                  style: Toast.Style.Success,
                  title: "SSH options saved",
                });
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not save SSH options",
                  message:
                    error instanceof Error ? error.message : String(error),
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Values are written as SSH config directives. Leave empty to remove a directive. Earlier global or Match rules may take precedence." />
      {advancedNames.map((name) => (
        <Form.TextField
          key={name}
          id={name}
          title={name}
          defaultValue={initial[name]}
          placeholder={
            {
              ForwardAgent: "yes / no / agent path",
              ServerAliveInterval: "Seconds, e.g. 10",
              ProxyJump: "e.g. bastion",
              ProxyCommand: "e.g. cloudflared access ssh --hostname %h",
              RemoteCommand: "Optional remote command",
              RequestTTY: "auto / yes / no / force",
              LocalForward: "e.g. 8080 localhost:80",
              RemoteForward: "e.g. 8080 localhost:80",
              DynamicForward: "e.g. 1080",
            }[name]
          }
        />
      ))}
    </Form>
  );
}

export default function Connections() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [configHosts, setConfigHosts] = useState<string[]>([]);
  const [configError, setConfigError] = useState<string>();
  function refreshConfig() {
    try {
      setConfigHosts(readConfigHosts());
      setConfigError(undefined);
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : String(error));
    }
  }
  const [loadError, setLoadError] = useState<string>();
  useEffect(() => {
    (async () => {
      refreshConfig();
      try {
        const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (
            !Array.isArray(parsed) ||
            !parsed.every(
              (item) =>
                item &&
                typeof item.id === "string" &&
                typeof item.name === "string" &&
                typeof item.host === "string" &&
                typeof item.user === "string" &&
                typeof item.port === "string" &&
                typeof item.identityFile === "string" &&
                typeof item.notes === "string" &&
                typeof item.favorite === "boolean",
            )
          )
            throw new Error("Saved connections have an unsupported format");
          setConnections(parsed);
        }
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : String(error));
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  async function persist(next: Connection[]) {
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setConnections(next);
  }
  async function save(connection: Connection) {
    await persist(
      connections.some((item) => item.id === connection.id)
        ? connections.map((item) =>
            item.id === connection.id ? connection : item,
          )
        : [...connections, connection],
    );
  }
  async function remove(connection: Connection) {
    if (
      !(await confirmAlert({
        title: `Delete ${connection.name}?`,
        message: "This removes the saved connection from Raycast.",
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      }))
    )
      return;
    try {
      await persist(connections.filter((item) => item.id !== connection.id));
      await showToast({
        style: Toast.Style.Success,
        title: "Connection deleted",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not delete connection",
        message: String(error),
      });
    }
  }
  async function toggleFavorite(connection: Connection) {
    try {
      await save({ ...connection, favorite: !connection.favorite });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not update favorite",
        message: String(error),
      });
    }
  }
  async function launch(connection: Connection) {
    try {
      await connect(
        connection,
        getPreferenceValues<{ terminal: Terminal }>().terminal || "terminal",
      );
      await showToast({
        style: Toast.Style.Success,
        title: "Opened terminal",
        message: connection.name,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not open terminal",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const add = (
    <Action.Push
      title="Add Connection"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<ConfigForm onSaved={refreshConfig} />}
    />
  );
  const sorted = [...connections].sort(
    (a, b) =>
      Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name),
  );
  return (
    <List
      isLoading={loading}
      onSearchTextChange={setSearchText}
      filtering
      searchBarPlaceholder="Search connections by name, host, username, or notes"
    >
      <List.EmptyView
        icon={Icon.Terminal}
        title={searchText ? "No matching connections" : "No SSH connections"}
        description={
          searchText
            ? "Try another name, host, or username."
            : "Add a host to connect from Raycast."
        }
        actions={
          <ActionPanel>
            {add}
            <Action
              title="Terminal Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
      {loadError && (
        <List.Section title="Previous Raycast Connections">
          <List.Item
            id="legacy:load-error"
            icon={Icon.ExclamationMark}
            title="Could not load previous Raycast connections"
            subtitle={loadError}
          />
        </List.Section>
      )}
      <List.Section
        title="Previous Raycast Connections"
        subtitle="Migrate to SSH config"
      >
        {sorted.map((connection) => (
          <List.Item
            key={`legacy:${connection.id}`}
            id={`legacy:${connection.id}`}
            icon={{
              source: connection.favorite ? Icon.Star : Icon.Terminal,
              tintColor: connection.favorite ? Color.Yellow : undefined,
            }}
            title={connection.name}
            subtitle={`${connection.user ? `${connection.user}@` : ""}${connection.host}${connection.port ? `:${connection.port}` : ""}`}
            keywords={[connection.host, connection.user, connection.notes]}
            accessories={connection.notes ? [{ text: connection.notes }] : []}
            actions={
              <ActionPanel>
                <Action
                  title="Connect"
                  icon={Icon.Terminal}
                  onAction={() => launch(connection)}
                />
                <Action.Push
                  title="Copy to SSH Config"
                  icon={Icon.Plus}
                  target={
                    <ConfigForm
                      initial={{
                        alias: connection.name.replace(/[^a-zA-Z0-9._-]/g, "-"),
                        host: connection.host,
                        user: connection.user,
                        port: connection.port,
                        identityFile: connection.identityFile,
                      }}
                      onSaved={refreshConfig}
                    />
                  }
                />
                {add}
                <Action
                  title={
                    connection.favorite
                      ? "Remove from Favorites"
                      : "Add to Favorites"
                  }
                  icon={Icon.Star}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                  onAction={() => toggleFavorite(connection)}
                />
                <Action.CopyToClipboard
                  title="Copy SSH Command"
                  content={sshCommand(connection)}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action
                  title="Terminal Preferences"
                  icon={Icon.Gear}
                  onAction={openExtensionPreferences}
                />
                <Action
                  title="Delete Connection"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                  onAction={() => remove(connection)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="SSH Config" subtitle="~/.ssh/config">
        {configHosts.map((host) => {
          const item: Connection = {
            id: `config:${host}`,
            name: host,
            host,
            user: "",
            port: "",
            identityFile: "",
            notes: "",
            favorite: false,
          };
          let details: ReturnType<typeof getConfigDisplay> | undefined;
          try {
            details = getConfigDisplay(host);
          } catch {
            /* Complex SSH rules remain usable by alias. */
          }
          let presentation: ReturnType<typeof getPresentation> | undefined;
          try {
            presentation = getPresentation(host);
          } catch {
            /* Keep the connection available. */
          }
          const destination = details?.host || "";
          const subtitle =
            destination || details?.user
              ? `${details?.conditional ? "Host block · " : ""}${details?.user ? `${details.user}@` : ""}${destination || host}`
              : undefined;
          return (
            <List.Item
              key={item.id}
              id={item.id}
              icon={presentation?.emoji || Icon.Terminal}
              title={host}
              subtitle={subtitle}
              keywords={[host, details?.host || "", details?.user || ""]}
              accessories={[
                ...(presentation?.advanced.ProxyJump ||
                presentation?.advanced.ProxyCommand
                  ? [
                      {
                        icon: Icon.ArrowRight,
                        tooltip: "Proxy configured in Host block",
                      },
                    ]
                  : []),
                ...(presentation?.advanced.ForwardAgent?.toLowerCase() === "yes"
                  ? [
                      {
                        icon: Icon.Person,
                        tooltip: "Agent forwarding enabled in Host block",
                      },
                    ]
                  : []),
                ...(presentation?.advanced.LocalForward ||
                presentation?.advanced.RemoteForward ||
                presentation?.advanced.DynamicForward
                  ? [
                      {
                        icon: Icon.Network,
                        tooltip: "Port forwarding configured in Host block",
                      },
                    ]
                  : []),
                ...(presentation?.advanced.RemoteCommand
                  ? [
                      {
                        icon: Icon.Terminal,
                        tooltip: "Remote command configured in Host block",
                      },
                    ]
                  : []),
                ...(details?.conditional
                  ? [
                      {
                        tag: {
                          value: "Conditional route",
                          color: Color.Orange,
                        },
                        tooltip: details.conditionalHosts.length
                          ? `Possible conditional host: ${details.conditionalHosts.join(", ")}. SSH chooses the route when connecting.`
                          : "SSH applies conditional rules when connecting.",
                      },
                    ]
                  : []),
                ...(details?.conditionalHosts?.length
                  ? [
                      {
                        text: details.conditionalHosts.join(", "),
                        icon: Icon.Globe,
                        tooltip:
                          "Possible conditional destination; not a live route check",
                      },
                    ]
                  : []),
                ...(details?.port
                  ? [
                      {
                        tag: {
                          value: `Port ${details.port}`,
                          color: Color.Blue,
                        },
                      },
                    ]
                  : []),
                ...(details?.identityFile
                  ? [{ icon: Icon.Key, tooltip: "Identity file configured" }]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Connect"
                    icon={Icon.Terminal}
                    onAction={() => launch(item)}
                  />
                  <Action.CopyToClipboard
                    title="Copy SSH Command"
                    content={sshCommand(item)}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <Action.Push
                    title="Edit Connection"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={
                      <ConfigEditor
                        key={`edit:${host}`}
                        alias={host}
                        onSaved={refreshConfig}
                      />
                    }
                  />
                  <Action.Push
                    title="Set Icon"
                    icon={Icon.Emoji}
                    target={
                      <EmojiForm
                        key={`icon:${host}`}
                        alias={host}
                        initial={presentation?.customEmoji || ""}
                        onSaved={refreshConfig}
                      />
                    }
                  />
                  <Action.Push
                    title="Edit SSH Options"
                    icon={Icon.Gear}
                    target={
                      <AdvancedEditor
                        key={`options:${host}`}
                        alias={host}
                        onSaved={refreshConfig}
                      />
                    }
                  />
                  <Action
                    title="Delete Connection"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                    onAction={async () => {
                      if (
                        !(await confirmAlert({
                          title: `Delete ${host}?`,
                          message:
                            "This removes its Host block from your SSH config.",
                          primaryAction: {
                            title: "Delete",
                            style: Alert.ActionStyle.Destructive,
                          },
                        }))
                      )
                        return;
                      try {
                        deleteConfigHost(host);
                        refreshConfig();
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Connection deleted from SSH config",
                        });
                      } catch (error) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Could not delete connection",
                          message:
                            error instanceof Error
                              ? error.message
                              : String(error),
                        });
                      }
                    }}
                  />
                  {add}
                  <Action
                    title="Refresh SSH Config"
                    icon={Icon.ArrowClockwise}
                    onAction={refreshConfig}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                  />
                  <Action
                    title="Terminal Preferences"
                    icon={Icon.Gear}
                    onAction={openExtensionPreferences}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {configError && (
        <List.Section title="SSH Config">
          <List.Item
            id="config:load-error"
            icon={Icon.ExclamationMark}
            title="Could not read SSH config"
            subtitle={configError}
            actions={
              <ActionPanel>
                <Action title="Retry" onAction={refreshConfig} />
                {add}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
