import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import type { LaunchProps } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Accessory, AgentDefinition, AgentId, UsageState } from "./agents/types";
import { useAmpUsage } from "./amp/fetcher";
import { formatAmpUsageText, getAmpAccessory, renderAmpDetail } from "./amp/renderer";
import type { AmpError, AmpUsage } from "./amp/types";
import { useAntigravityUsage } from "./antigravity/fetcher";
import { formatAntigravityUsageText, getAntigravityAccessory, renderAntigravityDetail } from "./antigravity/renderer";
import type { AntigravityError, AntigravityUsage } from "./antigravity/types";
import { useClaudeUsage } from "./claude/fetcher";
import { formatClaudeUsageText, getClaudeAccessory, renderClaudeDetail } from "./claude/renderer";
import type { ClaudeError, ClaudeUsage } from "./claude/types";
import { useCodexUsage, useCodexAccounts } from "./codex/fetcher";
import { formatCodexUsageText, getCodexAccessory, renderCodexDetail } from "./codex/renderer";
import type { CodexError, CodexUsage } from "./codex/types";
import { useDroidUsage } from "./droid/fetcher";
import { formatDroidUsageText, getDroidAccessory, renderDroidDetail } from "./droid/renderer";
import type { DroidError, DroidUsage } from "./droid/types";
import { useGeminiUsage } from "./gemini/fetcher";
import { launchGeminiReauth, shouldPromptGeminiReauth } from "./gemini/reauth";
import { formatGeminiUsageText, getGeminiAccessory, renderGeminiDetail } from "./gemini/renderer";
import type { GeminiError, GeminiUsage } from "./gemini/types";
import { useKimiUsage, useKimiAccounts } from "./kimi/fetcher";
import { formatKimiUsageText, getKimiAccessory, renderKimiDetail } from "./kimi/renderer";
import type { KimiError, KimiUsage } from "./kimi/types";
import { useSyntheticUsage, useSyntheticAccounts } from "./synthetic/fetcher";
import { formatSyntheticUsageText, getSyntheticAccessory, renderSyntheticDetail } from "./synthetic/renderer";
import type { SyntheticError, SyntheticUsage } from "./synthetic/types";
import { useZaiUsage, useZaiAccounts } from "./zai/fetcher";
import { formatZaiUsageText, getZaiAccessory, renderZaiDetail } from "./zai/renderer";
import type { ZaiError, ZaiUsage } from "./zai/types";
import { ManageAccountsForm } from "./accounts/ManageAccountsForm";
import type { AccountUsageState } from "./accounts/types";

const AGENT_ORDER_KEY = "agent-order";

type Preferences = Preferences.AgentUsage;
type ErrorLike = { type: string; message: string };
type CommandLaunchContext = { selectedAgentId?: string };

interface AgentRegistryEntry<TUsage, TError extends ErrorLike> extends AgentDefinition {
  useUsage: (enabled?: boolean) => UsageState<TUsage, TError>;
  renderDetail: (usage: TUsage | null, error: TError | null) => React.ReactNode;
  getAccessory: (usage: TUsage | null, error: TError | null, isLoading: boolean) => Accessory;
  formatUsageText: (usage: TUsage | null, error: TError | null) => string;
}

interface AgentUsageById {
  amp: AmpUsage;
  claude: ClaudeUsage;
  codex: CodexUsage;
  droid: DroidUsage;
  gemini: GeminiUsage;
  kimi: KimiUsage;
  synthetic: SyntheticUsage;
  antigravity: AntigravityUsage;
  zai: ZaiUsage;
}

interface AgentErrorById {
  amp: AmpError;
  claude: ClaudeError;
  codex: CodexError;
  droid: DroidError;
  gemini: GeminiError;
  kimi: KimiError;
  synthetic: SyntheticError;
  antigravity: AntigravityError;
  zai: ZaiError;
}

type AgentRegistry = {
  [K in AgentId]: AgentRegistryEntry<AgentUsageById[K], AgentErrorById[K]>;
};

interface AgentView extends AgentDefinition {
  isVisible: boolean;
  isLoading: boolean;
  revalidate: () => Promise<void>;
  getAccessory: () => Accessory;
  renderDetail: () => React.ReactNode;
  formatUsageText: () => string;
}

/** A list row for one named account of a multi-account provider. */
interface AccountedAgentView {
  /** Unique key for this row — e.g. "kimi-abc123" */
  rowId: string;
  /** Provider id — used to look up icon/settingsUrl */
  agentId: AgentId;
  /** Display name — e.g. "Kimi • Work" */
  title: string;
  /** Provider icon */
  icon: string;
  settingsUrl?: string;
  isVisible: boolean;
  isLoading: boolean;
  revalidate: () => Promise<void>;
  getAccessory: () => Accessory;
  renderDetail: () => React.ReactNode;
  formatUsageText: () => string;
  /** The account id, for use in the manage-accounts form */
  accountId: string;
  /** The provider key, for use in the manage-accounts form */
  provider: "kimi" | "zai" | "codex" | "synthetic";
  /** Whether this provider is supported (always true for accounted views) */
  isSupported: boolean;
  /** The API token for this account (for copying) */
  token: string;
  /** Whether this account's token matches the one configured in OpenCode */
  isOpenCodeActive?: boolean;
}

const AGENT_REGISTRY: AgentRegistry = {
  amp: {
    id: "amp",
    name: "Amp",
    icon: "amp-icon.svg",
    description: "Amp Code AI Assistant",
    isSupported: true,
    settingsUrl: "https://ampcode.com/settings",
    useUsage: useAmpUsage,
    renderDetail: renderAmpDetail,
    getAccessory: getAmpAccessory,
    formatUsageText: formatAmpUsageText,
  },
  claude: {
    id: "claude",
    name: "Claude",
    icon: "claude-icon.svg",
    description: "Anthropic Claude Code",
    isSupported: true,
    settingsUrl: "https://claude.ai/settings/billing",
    useUsage: useClaudeUsage,
    renderDetail: renderClaudeDetail,
    getAccessory: getClaudeAccessory,
    formatUsageText: formatClaudeUsageText,
  },
  codex: {
    id: "codex",
    name: "Codex",
    icon: "codex-icon.svg",
    description: "OpenAI Codex CLI",
    isSupported: true,
    settingsUrl: "https://chatgpt.com/codex/settings/usage",
    useUsage: useCodexUsage,
    renderDetail: renderCodexDetail,
    getAccessory: getCodexAccessory,
    formatUsageText: formatCodexUsageText,
  },
  droid: {
    id: "droid",
    name: "Droid",
    icon: "droid-icon.svg",
    description: "Factory AI Droid",
    isSupported: true,
    settingsUrl: "https://app.factory.ai/settings/billing",
    useUsage: useDroidUsage,
    renderDetail: renderDroidDetail,
    getAccessory: getDroidAccessory,
    formatUsageText: formatDroidUsageText,
  },
  gemini: {
    id: "gemini",
    name: "Gemini",
    icon: "gemini-icon.png",
    description: "Google Gemini CLI",
    isSupported: true,
    useUsage: useGeminiUsage,
    renderDetail: renderGeminiDetail,
    getAccessory: getGeminiAccessory,
    formatUsageText: formatGeminiUsageText,
  },
  antigravity: {
    id: "antigravity",
    name: "Antigravity",
    icon: "antigravity-icon.png",
    description: "Google Antigravity",
    isSupported: true,
    useUsage: useAntigravityUsage,
    renderDetail: renderAntigravityDetail,
    getAccessory: getAntigravityAccessory,
    formatUsageText: formatAntigravityUsageText,
  },
  kimi: {
    id: "kimi",
    name: "Kimi",
    icon: "kimi-icon.ico",
    description: "Moonshot Kimi Code",
    isSupported: true,
    settingsUrl: "https://www.kimi.com/code/console?from=membership",
    useUsage: useKimiUsage,
    renderDetail: renderKimiDetail,
    getAccessory: getKimiAccessory,
    formatUsageText: formatKimiUsageText,
  },
  synthetic: {
    id: "synthetic",
    name: "Synthetic",
    icon: "synthetic-icon.png",
    description: "Synthetic AI",
    isSupported: true,
    settingsUrl: "https://synthetic.new/billing",
    useUsage: useSyntheticUsage,
    renderDetail: renderSyntheticDetail,
    getAccessory: getSyntheticAccessory,
    formatUsageText: formatSyntheticUsageText,
  },
  zai: {
    id: "zai",
    name: "z.ai",
    icon: "zhipu-icon.svg",
    description: "Z.AI / GLM Coding Assistant",
    isSupported: true,
    settingsUrl: "https://z.ai",
    useUsage: useZaiUsage,
    renderDetail: renderZaiDetail,
    getAccessory: getZaiAccessory,
    formatUsageText: formatZaiUsageText,
  },
};

const AGENT_IDS = Object.keys(AGENT_REGISTRY) as AgentId[];

function isAgentId(value: string): value is AgentId {
  return value in AGENT_REGISTRY;
}

function createAgentView<TUsage, TError extends ErrorLike>(
  config: AgentRegistryEntry<TUsage, TError>,
  state: UsageState<TUsage, TError>,
  isVisible: boolean,
): AgentView {
  return {
    id: config.id,
    name: config.name,
    icon: config.icon,
    description: config.description,
    isSupported: config.isSupported,
    settingsUrl: config.settingsUrl,
    isVisible,
    isLoading: state.isLoading,
    revalidate: state.revalidate,
    getAccessory: () => config.getAccessory(state.usage, state.error, state.isLoading),
    renderDetail: () => config.renderDetail(state.usage, state.error),
    formatUsageText: () => config.formatUsageText(state.usage, state.error),
  };
}

function createAccountedViews<TUsage, TError extends { type: string; message: string }>(
  agentId: AgentId,
  providerName: string,
  icon: string,
  settingsUrl: string | undefined,
  provider: "kimi" | "zai" | "codex" | "synthetic",
  isVisible: boolean,
  accountStates: AccountUsageState<TUsage, TError>[],
  renderDetail: (usage: TUsage | null, error: TError | null) => React.ReactNode,
  getAccessory: (usage: TUsage | null, error: TError | null, isLoading: boolean) => Accessory,
  formatUsageText: (usage: TUsage | null, error: TError | null) => string,
): AccountedAgentView[] {
  return accountStates.map((state) => ({
    rowId: `${agentId}-${state.accountId}`,
    agentId,
    title: state.label === "Default" ? providerName : `${providerName} • ${state.label}`,
    icon,
    settingsUrl,
    isVisible,
    isLoading: state.isLoading,
    revalidate: state.revalidate,
    getAccessory: () => getAccessory(state.usage, state.error, state.isLoading),
    renderDetail: () => renderDetail(state.usage, state.error),
    formatUsageText: () => formatUsageText(state.usage, state.error),
    accountId: state.accountId,
    provider,
    isSupported: true,
    token: state.token,
    isOpenCodeActive: state.isOpenCodeActive,
  }));
}

export default function Command(props: LaunchProps<{ launchContext: CommandLaunchContext }>) {
  const prefs = getPreferenceValues<Preferences>();
  const { push } = useNavigation();

  // Hooks must be called unconditionally at top level (React rules)
  const ampState = AGENT_REGISTRY.amp.useUsage(Boolean(prefs.showAmp));
  const claudeState = AGENT_REGISTRY.claude.useUsage(Boolean(prefs.showClaude));
  const droidState = AGENT_REGISTRY.droid.useUsage(Boolean(prefs.showDroid));
  const geminiState = AGENT_REGISTRY.gemini.useUsage(Boolean(prefs.showGemini));
  const antigravityState = AGENT_REGISTRY.antigravity.useUsage(Boolean(prefs.showAntigravity));

  // Multi-account providers
  const codexAccountStates = useCodexAccounts(Boolean(prefs.showCodex));
  const kimiAccountStates = useKimiAccounts(Boolean(prefs.showKimi));
  const syntheticAccountStates = useSyntheticAccounts(Boolean(prefs.showSynthetic));
  const zaiAccountStates = useZaiAccounts(Boolean(prefs.showZai));

  const agentViews: Omit<Record<AgentId, AgentView>, "codex" | "kimi" | "synthetic" | "zai"> = {
    amp: createAgentView(AGENT_REGISTRY.amp, ampState, Boolean(prefs.showAmp)),
    claude: createAgentView(AGENT_REGISTRY.claude, claudeState, Boolean(prefs.showClaude)),
    droid: createAgentView(AGENT_REGISTRY.droid, droidState, Boolean(prefs.showDroid)),
    gemini: createAgentView(AGENT_REGISTRY.gemini, geminiState, Boolean(prefs.showGemini)),
    antigravity: createAgentView(AGENT_REGISTRY.antigravity, antigravityState, Boolean(prefs.showAntigravity)),
  };

  const kimiAccountedViews = createAccountedViews(
    "kimi",
    "Kimi",
    AGENT_REGISTRY.kimi.icon,
    AGENT_REGISTRY.kimi.settingsUrl,
    "kimi",
    Boolean(prefs.showKimi),
    kimiAccountStates,
    renderKimiDetail,
    getKimiAccessory,
    formatKimiUsageText,
  );

  const zaiAccountedViews = createAccountedViews(
    "zai",
    "z.ai",
    AGENT_REGISTRY.zai.icon,
    AGENT_REGISTRY.zai.settingsUrl,
    "zai",
    Boolean(prefs.showZai),
    zaiAccountStates,
    renderZaiDetail,
    getZaiAccessory,
    formatZaiUsageText,
  );

  const codexAccountedViews = createAccountedViews(
    "codex",
    "Codex",
    AGENT_REGISTRY.codex.icon,
    AGENT_REGISTRY.codex.settingsUrl,
    "codex",
    Boolean(prefs.showCodex),
    codexAccountStates,
    renderCodexDetail,
    getCodexAccessory,
    formatCodexUsageText,
  );

  const syntheticAccountedViews = createAccountedViews(
    "synthetic",
    "Synthetic",
    AGENT_REGISTRY.synthetic.icon,
    AGENT_REGISTRY.synthetic.settingsUrl,
    "synthetic",
    Boolean(prefs.showSynthetic),
    syntheticAccountStates,
    renderSyntheticDetail,
    getSyntheticAccessory,
    formatSyntheticUsageText,
  );

  const [agentOrder, setAgentOrder] = useState<AgentId[]>(AGENT_IDS);
  const [orderLoaded, setOrderLoaded] = useState(false);

  useEffect(() => {
    LocalStorage.getItem<string>(AGENT_ORDER_KEY).then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const validOrder = parsed.filter((id): id is AgentId => typeof id === "string" && isAgentId(id));
            const missingIds = AGENT_IDS.filter((id) => !validOrder.includes(id));
            setAgentOrder([...validOrder, ...missingIds]);
          }
        } catch {
          // keep default order
        }
      }
      setOrderLoaded(true);
    });
  }, []);

  const saveOrder = useCallback(async (newOrder: AgentId[]) => {
    setAgentOrder(newOrder);
    await LocalStorage.setItem(AGENT_ORDER_KEY, JSON.stringify(newOrder));
  }, []);

  // Build a flat list of renderable items — each is either a standard AgentView or an AccountedAgentView
  type ListRow = { kind: "agent"; view: AgentView } | { kind: "accounted"; view: AccountedAgentView };

  const allRows = useMemo<ListRow[]>(
    () =>
      agentOrder.flatMap((agentId): ListRow[] => {
        if (agentId === "codex") {
          return codexAccountedViews.filter((v) => v.isVisible).map((view) => ({ kind: "accounted", view }));
        }
        if (agentId === "kimi") {
          return kimiAccountedViews.filter((v) => v.isVisible).map((view) => ({ kind: "accounted", view }));
        }
        if (agentId === "synthetic") {
          return syntheticAccountedViews.filter((v) => v.isVisible).map((view) => ({ kind: "accounted", view }));
        }
        if (agentId === "zai") {
          return zaiAccountedViews.filter((v) => v.isVisible).map((view) => ({ kind: "accounted", view }));
        }
        if (agentId in agentViews) {
          const view = agentViews[agentId as keyof typeof agentViews];
          if (!view.isVisible) return [];
          return [{ kind: "agent", view }];
        }
        return [];
      }),
    [agentOrder, codexAccountedViews, kimiAccountedViews, syntheticAccountedViews, zaiAccountedViews, agentViews],
  );

  const requestedSelectedAgentId = props.launchContext?.selectedAgentId;
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(() =>
    typeof requestedSelectedAgentId === "string" && isAgentId(requestedSelectedAgentId)
      ? requestedSelectedAgentId
      : undefined,
  );

  useEffect(() => {
    if (allRows.length === 0) {
      if (selectedItemId !== undefined) {
        setSelectedItemId(undefined);
      }
      return;
    }

    const allIds = allRows.map((r) => (r.kind === "agent" ? r.view.id : r.view.rowId));
    if (selectedItemId && allIds.includes(selectedItemId)) return;
    setSelectedItemId(allIds[0]);
  }, [selectedItemId, allRows]);

  const isLoading = allRows.some((row) => (row.kind === "agent" ? row.view.isLoading : row.view.isLoading));

  const hasPromptedGeminiReauth = useRef(false);

  const handleGeminiReauth = useCallback(async () => {
    const toast = await showToast({
      title: "Running Gemini Re-Authentication",
      message: "Please complete Gemini login flow.",
      style: Toast.Style.Animated,
    });

    try {
      await launchGeminiReauth();
      await geminiState.revalidate();

      toast.style = Toast.Style.Success;
      toast.title = "Gemini Re-Authentication Completed";
      toast.message = "Usage check refreshed.";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Gemini Re-Authentication Failed";
      toast.message = error instanceof Error ? error.message : "Please run 'gemini' manually.";
    }
  }, [geminiState.revalidate]);

  useEffect(() => {
    const errorType = geminiState.error?.type;

    if (Boolean(prefs.showGemini) && shouldPromptGeminiReauth(errorType, hasPromptedGeminiReauth.current)) {
      hasPromptedGeminiReauth.current = true;
      void showToast({
        title: "Gemini Token Expired",
        message: "Run 'gemini' to refresh your login.",
        style: Toast.Style.Failure,
        primaryAction: {
          title: "Run Gemini Re-Authentication",
          onAction: () => {
            void handleGeminiReauth();
          },
        },
      });
      return;
    }

    if (errorType !== "unauthorized") {
      hasPromptedGeminiReauth.current = false;
    }
  }, [prefs.showGemini, geminiState.error?.type, handleGeminiReauth]);

  const handleRefresh = async () => {
    await Promise.all(allRows.map((row) => row.view.revalidate()));
    await showToast({
      title: "Refreshed",
      style: Toast.Style.Success,
    });
  };

  const moveAgent = useCallback(
    async (agentId: AgentId, direction: "up" | "down") => {
      const currentIndex = agentOrder.indexOf(agentId);
      if (currentIndex === -1) return;

      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= agentOrder.length) return;

      const newOrder = [...agentOrder];
      [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];
      await saveOrder(newOrder);
    },
    [agentOrder, saveOrder],
  );

  return (
    <List
      isLoading={!orderLoaded || isLoading}
      isShowingDetail
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => setSelectedItemId(id ?? undefined)}
    >
      {orderLoaded &&
        allRows.map((row, index) => {
          if (row.kind === "agent") {
            const agent = row.view;
            const accessory = agent.getAccessory();
            const detail = agent.renderDetail();
            const canMoveUp = index > 0;
            const canMoveDown = index < allRows.length - 1;

            return (
              <List.Item
                key={agent.id}
                id={agent.id}
                icon={agent.icon}
                title={agent.name}
                subtitle={agent.isSupported ? undefined : "(Coming Soon)"}
                accessories={[{ icon: accessory.icon, text: accessory.text, tooltip: accessory.tooltip }]}
                detail={<List.Item.Detail metadata={detail} />}
                actions={
                  <ActionPanel>
                    {agent.isSupported && (
                      <>
                        <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={handleRefresh} />
                        <Action.CopyToClipboard
                          title="Copy Usage Details"
                          content={agent.formatUsageText()}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                        />
                        {agent.id === "gemini" && geminiState.error?.type === "unauthorized" && (
                          <Action title="Run Gemini Re-Authentication" icon={Icon.Key} onAction={handleGeminiReauth} />
                        )}
                        {agent.settingsUrl && (
                          <Action.OpenInBrowser
                            title={`Open ${agent.name} Settings`}
                            url={agent.settingsUrl}
                            shortcut={Keyboard.Shortcut.Common.Open}
                          />
                        )}
                      </>
                    )}
                    <ActionPanel.Section title="Reorder">
                      {canMoveUp && (
                        <Action
                          title="Move Up" // eslint-disable-line @raycast/prefer-title-case
                          icon={Icon.ArrowUp}
                          shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                          onAction={() => moveAgent(agent.id, "up")}
                        />
                      )}
                      {canMoveDown && (
                        <Action
                          title="Move Down"
                          icon={Icon.ArrowDown}
                          shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                          onAction={() => moveAgent(agent.id, "down")}
                        />
                      )}
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          } else {
            const view = row.view;
            const accessory = view.getAccessory();
            const detail = view.renderDetail();
            const canMoveUp = index > 0;
            const canMoveDown = index < allRows.length - 1;

            return (
              <List.Item
                key={view.rowId}
                id={view.rowId}
                icon={view.icon}
                title={view.title}
                accessories={[
                  ...(view.isOpenCodeActive
                    ? [
                        {
                          icon: { source: Icon.Bolt, tintColor: Color.Green },
                          tooltip: "⚡ Currently used in OpenCode",
                        },
                      ]
                    : []),
                  { icon: accessory.icon, text: accessory.text, tooltip: accessory.tooltip },
                ]}
                detail={<List.Item.Detail metadata={detail} />}
                actions={
                  <ActionPanel>
                    <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={handleRefresh} />
                    <Action.CopyToClipboard
                      title="Copy Usage Details"
                      content={view.formatUsageText()}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    {view.token && (
                      <Action.CopyToClipboard
                        title="Copy API Key"
                        content={view.token}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                    )}
                    <Action
                      title="Manage Accounts"
                      icon={Icon.Person}
                      shortcut={{ modifiers: ["cmd"], key: "m" }}
                      onAction={() =>
                        push(
                          <ManageAccountsForm
                            provider={view.provider}
                            providerName={
                              view.agentId === "kimi"
                                ? "Kimi"
                                : view.agentId === "zai"
                                  ? "z.ai"
                                  : view.agentId === "codex"
                                    ? "Codex"
                                    : "Synthetic"
                            }
                            onSave={handleRefresh}
                          />,
                        )
                      }
                    />
                    {view.settingsUrl && (
                      <Action.OpenInBrowser
                        title={`Open ${
                          view.agentId === "kimi"
                            ? "Kimi"
                            : view.agentId === "zai"
                              ? "z.ai"
                              : view.agentId === "codex"
                                ? "Codex"
                                : "Synthetic"
                        } Settings`}
                        url={view.settingsUrl}
                        shortcut={Keyboard.Shortcut.Common.Open}
                      />
                    )}
                    <ActionPanel.Section title="Reorder">
                      {canMoveUp && (
                        <Action
                          title="Move Up" // eslint-disable-line @raycast/prefer-title-case
                          icon={Icon.ArrowUp}
                          shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                          onAction={() => moveAgent(view.agentId, "up")}
                        />
                      )}
                      {canMoveDown && (
                        <Action
                          title="Move Down"
                          icon={Icon.ArrowDown}
                          shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                          onAction={() => moveAgent(view.agentId, "down")}
                        />
                      )}
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          }
        })}
    </List>
  );
}
