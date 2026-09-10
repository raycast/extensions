import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { UNKNOWN_REACHABILITY, type Reachability } from "./lib/argocd/probe";
import { instanceHost, removeInstance, upsertInstance, type ArgoInstance } from "./lib/config/instances";
import { InstanceForm } from "./ui/InstanceForm";
import { loginWithSso } from "./ui/oidcLogin";
import {
  clearSecrets,
  clearSsoSession,
  readApiToken,
  readSsoSession,
  writeApiToken,
  writeSsoSession,
} from "./ui/deps";
import { probe, ssoLogin } from "./ui/deps";
import { loadInstances, loadReachability, saveInstances, saveReachability } from "./ui/storage";
import { environmentColor, reachabilityIcon, reachabilityText } from "./ui/statusVisuals";

export default function ManageInstances() {
  const { push } = useNavigation();
  const [instances, setInstances] = useState<ArgoInstance[]>([]);
  const [reachability, setReachability] = useState<Record<string, Reachability>>({});
  /** Whether each single sign-on instance currently holds a session that can be renewed. */
  const [signedIn, setSignedIn] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const persist = useCallback(async (next: ArgoInstance[]) => {
    await saveInstances(next);
    setInstances(next);
  }, []);

  const refreshSessions = useCallback(async (targets: ArgoInstance[]) => {
    const entries = await Promise.all(
      targets
        .filter((instance) => instance.authMode === "sso")
        .map(async (instance) => {
          const session = await readSsoSession(instance.id).catch(() => undefined);
          return [instance.id, session?.refreshToken !== undefined] as const;
        }),
    );
    setSignedIn(Object.fromEntries(entries));
  }, []);

  const checkAll = useCallback(async (targets: ArgoInstance[]) => {
    const results = await Promise.all(
      targets.map(async (instance) => [instance.id, await probe(instance)] as const),
    );
    const map = Object.fromEntries(results);
    setReachability((current) => ({ ...current, ...map }));
    await saveReachability({ ...(await loadReachability()), ...map });
  }, []);

  useEffect(() => {
    void (async () => {
      const stored = await loadInstances();
      setInstances(stored);
      setReachability(await loadReachability());
      setLoading(false);
      await refreshSessions(stored);
      await checkAll(stored);
    })();
  }, [checkAll, refreshSessions]);

  async function remove(instance: ArgoInstance) {
    const confirmed = await confirmAlert({
      title: `Remove ${instance.name}?`,
      message: "The extension stops querying it. Nothing changes on the ArgoCD server itself.",
      icon: Icon.Trash,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }
    await persist(removeInstance(instances, instance.id));
    // The stored credentials have no other owner, so they go with the instance.
    await clearSecrets(instance.id).catch(() => undefined);
    await showToast({ style: Toast.Style.Success, title: `Removed ${instance.name}` });
  }

  /**
   * The browser login. It runs once per instance; everything after it is silent, which is the
   * whole reason this mode exists.
   */
  async function loginSso(instance: ArgoInstance) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Signing in to ${instance.name}`,
      message: "Finish the sign-in in your browser.",
    });
    try {
      const { session, settings } = await loginWithSso(instance);
      await writeSsoSession(instance.id, session);
      toast.style = Toast.Style.Success;
      toast.title = `Signed in to ${instance.name}`;
      toast.message = settings.usesCliClient
        ? "The session will renew itself from now on."
        : "Signed in through the web client. If renewal fails, set oidc.cliClientID in argocd-cm.";
      await refreshSessions(instances);
      await checkAll([instance]);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Sign-in did not complete";
      toast.message = (error as Error).message;
    }
  }

  async function signOut(instance: ArgoInstance) {
    await clearSsoSession(instance.id);
    await refreshSessions(instances);
    await showToast({ style: Toast.Style.Success, title: `Signed out of ${instance.name}` });
  }

  async function login(instance: ArgoInstance) {
    const host = instanceHost(instance);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Logging in to ${host}`,
      message: "Finish the login in your browser.",
    });
    try {
      await ssoLogin(host);
      toast.style = Toast.Style.Success;
      toast.title = `Logged in to ${host}`;
      toast.message = undefined;
      await checkAll([instance]);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "SSO login did not complete";
      toast.message = (error as Error).message;
    }
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Filter instances">
      <List.EmptyView
        icon={Icon.Plus}
        title="No ArgoCD instance configured"
        description="Add the server URL of each ArgoCD you want to search. Nothing is stored outside this Mac."
        actions={
          <ActionPanel>
            <Action
              title="Add Instance"
              icon={Icon.Plus}
              onAction={() => push(<InstanceForm instances={instances} onSaved={persist} />)}
            />
          </ActionPanel>
        }
      />
      {instances.map((instance) => {
        const state = reachability[instance.id] ?? UNKNOWN_REACHABILITY;
        return (
          <List.Item
            key={instance.id}
            icon={reachabilityIcon(state)}
            title={instance.name}
            subtitle={instance.baseUrl}
            accessories={[
              { text: reachabilityText(state) },
              {
                tag: {
                  value: instance.allowWrite ? "write enabled" : "read-only",
                  color: instance.allowWrite ? Color.Orange : Color.SecondaryText,
                },
              },
              { tag: { value: instance.env, color: environmentColor(instance.env) } },
              ...(instance.authMode === "sso"
                ? [
                    {
                      // A session with a refresh token needs nothing further; without one the
                      // operator has to sign in, and that is worth seeing before it fails.
                      tag: {
                        value: signedIn[instance.id] ? "signed in" : "sign in needed",
                        color: signedIn[instance.id] ? Color.Green : Color.Orange,
                      },
                      tooltip: signedIn[instance.id]
                        ? "The session renews itself silently."
                        : "No renewable session yet. Use Log in with single sign-on.",
                    },
                  ]
                : []),
              ...(instance.enabled ? [] : [{ tag: { value: "excluded", color: Color.SecondaryText } }]),
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Edit Instance"
                    icon={Icon.Pencil}
                    onAction={() =>
                      push(<InstanceForm instances={instances} editing={instance} onSaved={persist} />)
                    }
                  />
                  <Action
                    title="Check Reachability"
                    icon={Icon.Network}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    onAction={() => void checkAll(instances)}
                  />
                  <Action
                    title={instance.enabled ? "Exclude from Searches" : "Include in Searches"}
                    icon={instance.enabled ? Icon.EyeDisabled : Icon.Eye}
                    onAction={() =>
                      void persist(upsertInstance(instances, { ...instance, enabled: !instance.enabled }))
                    }
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Authentication">
                  {instance.authMode === "sso" ? (
                    <Action
                      title="Log in with Single Sign-On"
                      icon={Icon.Fingerprint}
                      onAction={() => void loginSso(instance)}
                    />
                  ) : null}
                  {instance.authMode === "sso" ? (
                    <Action
                      title="Sign out"
                      icon={Icon.Logout}
                      style={Action.Style.Destructive}
                      onAction={() => void signOut(instance)}
                    />
                  ) : null}
                  {instance.authMode === "cli" ? (
                    <Action
                      title="Log in with SSO"
                      icon={Icon.Person}
                      onAction={() => void login(instance)}
                    />
                  ) : (
                    <Action
                      title="Set API Token"
                      icon={Icon.Key}
                      onAction={() => push(<TokenForm instance={instance} />)}
                    />
                  )}
                  {instance.authMode === "token" ? (
                    <Action
                      title="Clear API Token"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={async () => {
                        await clearSecrets(instance.id);
                        await showToast({ style: Toast.Style.Success, title: "Token removed" });
                      }}
                    />
                  ) : null}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.OpenInBrowser title="Open ArgoCD" url={instance.baseUrl} />
                  <Action
                    title="Add Instance"
                    icon={Icon.Plus}
                    shortcut={Keyboard.Shortcut.Common.New}
                    onAction={() => push(<InstanceForm instances={instances} onSaved={persist} />)}
                  />
                  <Action
                    title="Remove Instance"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => void remove(instance)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function TokenForm({ instance }: { instance: ArgoInstance }) {
  const { pop } = useNavigation();
  const [token, setToken] = useState("");
  const [hasExisting, setHasExisting] = useState(false);

  useEffect(() => {
    void readApiToken(instance.id)
      .then((existing: string | undefined) => setHasExisting(existing !== undefined))
      .catch(() => setHasExisting(false));
  }, [instance.id]);

  return (
    <Form
      navigationTitle={`API token for ${instance.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Store Token"
            icon={Icon.Key}
            onSubmit={async () => {
              const trimmed = token.trim();
              if (trimmed.length === 0) {
                await showToast({ style: Toast.Style.Failure, title: "The token is empty" });
                return;
              }
              try {
                // writeApiToken reads the value back before it returns, so reaching this toast
                // means the store really holds the token. That habit is inherited from a
                // keychain write that announced success having stored nothing.
                await writeApiToken(instance.id, trimmed);
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "The token was not stored",
                  message: (error as Error).message,
                });
                return;
              }
              await showToast({ style: Toast.Style.Success, title: "Token stored" });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Where it is stored"
        text={`In Raycast's encrypted storage, which only this extension can read.${
          hasExisting ? " A token is already stored for this instance and will be replaced." : ""
        }`}
      />
      <Form.PasswordField
        id="token"
        title="API token"
        placeholder="argocd account generate-token --account <name>"
        value={token}
        onChange={setToken}
      />
    </Form>
  );
}
