/**
 * Connect to Synap Pod
 *
 * Two connection paths:
 *   A. Synap Cloud — opens synap.live/raycast in browser, handles OAuth
 *      login + pod selection + API key generation. On success, redirects
 *      back here via deeplink with credentials pre-filled.
 *   B. Self-hosted — form: Pod URL + Hub Protocol API key.
 *
 * Deeplink pattern (from Synap Cloud OAuth):
 *   raycast://extensions/AntoineSrvt/synap/connect?context={"apiKey":"...","podUrl":"...","workspaceId":"..."}
 *
 * Workspace ID is optional: it is only a default scope hint for Hub calls. If the flow
 * sends an id we cannot confirm (or none), Raycast uses all workspaces the key can access.
 */

import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  List,
  Color,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
  LaunchProps,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useEffect } from "react";
import {
  buildPodAdminConnectUrl,
  parseConnectContext,
  type DeeplinkContext,
} from "@synap-core/external-connect-client";
import { HubRestClient } from "@synap/hub-rest-client";
import { checkPodHealth, HubApiError } from "./api/client";
import { saveConnection, clearConnection, getConnection, RAYCAST_CONNECT_DEEPLINK } from "./utils/preferences";
import { readCliConfig, listCliProfiles } from "./utils/cli-config";
import { useMe } from "./hooks/useWorkspace";
import { PodSwitcher, describeConnectionError, ConnectionErrorActions, useConnection } from "./components/connection";

// ─── Launch context (from Synap Cloud OAuth callback via raycast://...?context=) ──

interface ConnectContext {
  apiKey?: string;
  podUrl?: string;
  workspaceId?: string;
  context?: string;
}

// ─── Connected state ──────────────────────────────────────────────────────────

function ConnectedView({ onDisconnect }: { onDisconnect: () => void }) {
  // The shared connection door is the source of truth for WHICH pod/key is
  // active; the raw CLI config is only consulted for presentation extras it
  // does not expose (profile count, label, whether Raycast overrides the default).
  const { connection, revalidate: revalidateConnection, podKey } = useConnection();
  const { data: me, isLoading, error, revalidate: revalidateMe } = useMe(podKey);
  const { push } = useNavigation();

  const cliConfig = readCliConfig();
  const hasMultiplePods = cliConfig ? listCliProfiles(cliConfig).length > 1 : false;
  const usingCli = connection?.source === "cli";

  const podLabel = usingCli && connection?.podName ? cliConfig?.pods[connection.podName]?.label : undefined;
  const isRaycastOnly = usingCli && cliConfig ? connection?.podName !== cliConfig.activePod : false;

  const podLine = connection
    ? `**Raycast pod:** ${connection.podName ?? connection.podUrl}${podLabel && podLabel !== connection.podName ? ` (${podLabel})` : ""}  ·  \`${connection.podUrl}\`${isRaycastOnly ? "  _(Raycast only)_" : ""}`
    : "";

  const errorInfo = error ? describeConnectionError(error) : null;

  const markdown = `
# ${errorInfo ? "Synap — connection problem" : "Connected to Synap"}

${
  errorInfo
    ? `⚠️ **${errorInfo.title}**\n\n${errorInfo.description}`
    : me
      ? `Logged in as **${me.name ?? me.email}**`
      : "Verifying connection…"
}

${podLine}

${errorInfo ? "" : "Your Synap Raycast extension is ready."}

## Commands

| Command | What it does |
|---------|-------------|
| **Search Synap** | Find any entity in your knowledge graph |
| **Quick Capture** | Save selected text as a Synap entity |
| **Capture Browser Tab** | Bookmark the active browser page |
| **Create Task** | Structured task with due date + priority |
| **Synap Status** | Menu bar widget with pending tasks |
| **@synap** in Raycast AI | Query your knowledge graph via AI |

${usingCli ? `_Pod config from \`~/.synap/config.json\` — use **Switch Pod** to assign a different pod to Raycast only._` : "_To manage pods: run `synap pods add` in your terminal._"}
`;

  return (
    <Detail
      isLoading={isLoading && !me && !error}
      markdown={markdown}
      actions={
        <ActionPanel>
          {hasMultiplePods && (
            <Action
              title="Switch Pod"
              icon={Icon.ArrowRight}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
              onAction={() => push(<PodSwitcher onSwitched={revalidateConnection} />)}
            />
          )}
          {error && (
            <ConnectionErrorActions
              error={error}
              onRetry={() => {
                revalidateConnection();
                revalidateMe();
              }}
            />
          )}
          {error && !usingCli && (
            <Action title="Reconnect with Synap Cloud" icon={Icon.Globe} onAction={() => open(CLOUD_AUTH_URL)} />
          )}
          <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          {!usingCli && (
            <Action
              title="Disconnect"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              onAction={async () => {
                await clearConnection();
                onDisconnect();
              }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

/**
 * Validates the Hub key (`getMe`) and resolves an optional default workspace id.
 * Never fails connect solely because a suggested workspace id is missing from the list —
 * that id is a hint; users have access to all workspaces permitted by the key.
 */
async function verifyHubConnection(context: DeeplinkContext): Promise<{ workspaceId?: string }> {
  const client = new HubRestClient({
    podUrl: context.podUrl,
    apiKey: context.apiKey,
    workspaceId: context.workspaceId ?? undefined,
  });

  await client.getMe();

  const requested = context.workspaceId?.trim();
  if (!requested) {
    return {};
  }

  try {
    const workspaces = await client.getWorkspaces();
    const match = workspaces.some((ws) => ws.id === requested);
    if (match) {
      return { workspaceId: requested };
    }
    // Stale or unknown id from an older connect payload — omit default; Hub calls stay unscoped / all.
    return {};
  } catch {
    // Listing failed (network, etc.) — keep the hint; worst case Hub ignores invalid ids per call.
    return { workspaceId: requested };
  }
}

function formatConnectError(err: unknown): string {
  if (err instanceof HubApiError && err.isUnauthorized) {
    return "Synap rejected this key (401 Unauthorized). The key is invalid, expired, or revoked. Disconnect then reconnect from Synap Cloud to issue a fresh key.";
  }
  return err instanceof Error ? err.message : String(err);
}

// ─── Synap Cloud path ─────────────────────────────────────────────────────────

const CLOUD_AUTH_URL = "https://synap.live/raycast?redirect_uri=raycast://extensions/AntoineSrvt/synap/connect";

function CloudConnectView() {
  return (
    <Detail
      markdown={`
# Connect with Synap Cloud

Click **Open Browser** to sign in to your Synap account.

After login, Synap will automatically:
1. Find your data pod
2. Generate a Hub Protocol API key for Raycast
3. Open Raycast with your credentials ready

No manual copy-paste needed.
`}
      actions={
        <ActionPanel>
          <Action title="Open Browser to Sign In" icon={Icon.Globe} onAction={() => open(CLOUD_AUTH_URL)} />
          <Action.OpenInBrowser
            title="Open Synap.live/raycast"
            url={CLOUD_AUTH_URL}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    />
  );
}

// ─── Self-hosted path ─────────────────────────────────────────────────────────

function SelfHostedForm({ onSuccess }: { onSuccess: () => void }) {
  const { pop, push } = useNavigation();
  const [step, setStep] = useState<"url" | "key">("url");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedPodUrl, setVerifiedPodUrl] = useState("");
  const [podVersion, setPodVersion] = useState("");

  // Step 1 — verify pod URL
  async function handleVerifyUrl(values: { podUrl: string }) {
    const podUrl = values.podUrl.trim().replace(/\/$/, "");
    if (!podUrl) {
      await showToast({ style: Toast.Style.Failure, title: "Pod URL is required" });
      return;
    }

    setIsVerifying(true);
    await showToast({ style: Toast.Style.Animated, title: "Checking pod…" });

    try {
      const status = await checkPodHealth(podUrl);
      if (!status.healthy) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Pod unreachable",
          message: `Cannot reach ${podUrl}`,
        });
        return;
      }
      setVerifiedPodUrl(podUrl);
      setPodVersion(status.version ?? "");
      setStep("key");
      await showToast({ style: Toast.Style.Success, title: "Pod found", message: `v${status.version ?? "?"}` });
    } catch (err) {
      const message = err instanceof HubApiError ? err.message : String(err);
      await showToast({ style: Toast.Style.Failure, title: "Unreachable", message });
    } finally {
      setIsVerifying(false);
    }
  }

  // Step 2a — open admin panel for automatic key generation
  function handleOpenAdminPanel() {
    const connectUrl = buildPodAdminConnectUrl({
      podUrl: verifiedPodUrl,
      integration: "raycast",
      redirectUri: RAYCAST_CONNECT_DEEPLINK,
    });
    open(connectUrl);
  }

  // Step 2b — manual key entry
  async function handleManualKey(values: { apiKey: string; workspaceId: string }) {
    const apiKey = values.apiKey.trim();
    if (!apiKey) {
      await showToast({ style: Toast.Style.Failure, title: "API key is required" });
      return;
    }

    const workspaceId = values.workspaceId?.trim() || undefined;

    try {
      const { workspaceId: resolvedWs } = await verifyHubConnection({
        podUrl: verifiedPodUrl,
        apiKey,
        workspaceId: workspaceId ?? null,
      });
      await saveConnection({
        podUrl: verifiedPodUrl,
        apiKey,
        workspaceId: resolvedWs,
        keySource: "pod",
      });
    } catch (err) {
      await clearConnection();
      await showToast({
        style: Toast.Style.Failure,
        title: "Connection failed",
        message: formatConnectError(err),
      });
      return;
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Connected!",
      message: podVersion ? `Pod v${podVersion}` : verifiedPodUrl,
    });
    onSuccess();
    pop();
  }

  // Step 1 — enter pod URL
  if (step === "url") {
    return (
      <Form
        isLoading={isVerifying}
        navigationTitle="Self-hosted Setup"
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Verify Pod" icon={Icon.MagnifyingGlass} onSubmit={handleVerifyUrl} />
          </ActionPanel>
        }
      >
        <Form.Description text="Enter your Synap pod URL to get started." />
        <Form.TextField id="podUrl" title="Pod URL" placeholder="https://your-pod.synap.live" autoFocus />
      </Form>
    );
  }

  // Step 2 — pod verified, choose how to get the API key
  return (
    <List navigationTitle={`Connect to ${verifiedPodUrl}`} searchBarPlaceholder="">
      <List.Section title={`Pod: ${verifiedPodUrl}${podVersion ? `  ·  v${podVersion}` : ""}`}>
        <List.Item
          icon={{ source: Icon.Globe, tintColor: Color.Blue }}
          title="Generate key via Admin Panel"
          subtitle="Opens your pod admin — automatic, no copy-paste"
          accessories={[{ text: "Recommended", icon: { source: Icon.Star, tintColor: Color.Yellow } }]}
          actions={
            <ActionPanel>
              <Action title="Open Admin Panel" icon={Icon.Globe} onAction={handleOpenAdminPanel} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.Key, tintColor: Color.SecondaryText }}
          title="Enter API key manually"
          subtitle="Paste an existing Hub Protocol API key"
          actions={
            <ActionPanel>
              <Action
                title="Enter Key Manually"
                icon={Icon.Key}
                onAction={() =>
                  push(
                    <Form
                      navigationTitle="Enter API Key"
                      actions={
                        <ActionPanel>
                          <Action.SubmitForm title="Connect" icon={Icon.Plug} onSubmit={handleManualKey} />
                        </ActionPanel>
                      }
                    >
                      <Form.Description text={`Pod: ${verifiedPodUrl}`} />
                      <Form.PasswordField
                        id="apiKey"
                        title="Hub Protocol API Key"
                        placeholder="synap_hub_live_..."
                        autoFocus
                      />
                      <Form.TextField
                        id="workspaceId"
                        title="Default workspace (optional)"
                        placeholder="Leave empty — all workspaces your key can access"
                      />
                      <Form.Separator />
                      <Form.Description text="Get a key: pod-url/admin → API Keys → Raycast preset. Storing memory requires hub-protocol.write (read-only keys return 403)." />
                    </Form>
                  )
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

// ─── Choice screen ─────────────────────────────────────────────────────────

function ChoiceView({ onSuccess }: { onSuccess: () => void }) {
  const { push } = useNavigation();

  return (
    <List navigationTitle="Connect to Synap" searchBarPlaceholder="">
      <List.Section title="How is your pod hosted?">
        <List.Item
          icon={{ source: Icon.Globe, tintColor: Color.Blue }}
          title="Synap Cloud"
          subtitle="Hosted by Synap — automatic setup"
          accessories={[{ text: "Recommended", icon: { source: Icon.Star, tintColor: Color.Yellow } }]}
          actions={
            <ActionPanel>
              <Action title="Connect with Synap Cloud" icon={Icon.Globe} onAction={() => push(<CloudConnectView />)} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.Terminal, tintColor: Color.SecondaryText }}
          title="Self-Hosted"
          subtitle="Running on your own server or locally"
          actions={
            <ActionPanel>
              <Action
                title="Set up Self-hosted Pod"
                icon={Icon.Terminal}
                onAction={() => push(<SelfHostedForm onSuccess={onSuccess} />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

// ─── Auto-configure from deeplink ─────────────────────────────────────────────

function DeeplinkConfiguringView({
  context,
  onDone,
}: {
  context: DeeplinkContext;
  onDone: (success: boolean) => void;
}) {
  const { push } = useNavigation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    async function configure() {
      const { apiKey, podUrl, workspaceId } = context;
      if (!apiKey || !podUrl) {
        setError("Missing credentials in deeplink. Please try again via Synap Cloud.");
        setStatus("error");
        return;
      }

      try {
        const { workspaceId: resolvedWs } = await verifyHubConnection({
          apiKey,
          podUrl,
          workspaceId: workspaceId ?? null,
        });
        await saveConnection({
          podUrl,
          apiKey,
          workspaceId: resolvedWs,
          keySource: "agent",
        });
        setStatus("success");
        await showToast({ style: Toast.Style.Success, title: "Connected to Synap!", message: podUrl });
        onDone(true);
      } catch (err) {
        await clearConnection();
        setError(formatConnectError(err));
        setStatus("error");
        onDone(false);
      }
    }
    configure();
  }, [context, onDone]);

  const markdown =
    status === "loading"
      ? "# Configuring Synap…\n\nSaving your credentials…"
      : status === "success"
        ? `# Connected!\n\nYour Synap Raycast extension is ready.\n\nClose this window and start using:\n- **Search Synap** — find entities\n- **@synap** in Raycast AI — query your knowledge graph`
        : `# Connection failed\n\n${error}`;

  return (
    <Detail
      markdown={markdown}
      actions={
        status === "error" ? (
          // The deeplink can originate from Synap Cloud OR a self-hosted admin
          // panel — offer both recovery paths, not just Cloud.
          <ActionPanel>
            <Action title="Try Again Via Synap Cloud" icon={Icon.Globe} onAction={() => open(CLOUD_AUTH_URL)} />
            <Action
              title="Set up Self-hosted Pod"
              icon={Icon.Terminal}
              onAction={() => push(<SelfHostedForm onSuccess={() => onDone(true)} />)}
            />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

// ─── Root command ─────────────────────────────────────────────────────────────

export default function Connect({ launchContext }: LaunchProps<{ launchContext: ConnectContext }>) {
  // Async check: covers both Raycast Preferences AND LocalStorage (Cloud OAuth).
  // Using null as the "still checking" sentinel so we don't flash the choice
  // screen for users who connected via Cloud OAuth (stored in LocalStorage).
  const { data: connection, isLoading } = useCachedPromise(getConnection, []);
  const [overrideConnected, setOverrideConnected] = useState<boolean | null>(null);

  const connected = overrideConnected ?? (connection !== null && connection !== undefined);

  // Deeplink callback from Synap Cloud OAuth/admin:
  //   raycast://extensions/AntoineSrvt/synap/connect?context={"apiKey":"...","podUrl":"..."}
  const deeplinkContext = parseConnectContext(launchContext);
  if (deeplinkContext?.apiKey && deeplinkContext?.podUrl) {
    return <DeeplinkConfiguringView context={deeplinkContext} onDone={(success) => setOverrideConnected(success)} />;
  }

  if (isLoading) {
    return <Detail isLoading markdown="" />;
  }

  if (connected) {
    return <ConnectedView onDisconnect={() => setOverrideConnected(false)} />;
  }

  return <ChoiceView onSuccess={() => setOverrideConnected(true)} />;
}
