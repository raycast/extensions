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

import { ManageAccountsForm } from "./accounts/ManageAccountsForm.tsx";
import type { AccountUsageState } from "./accounts/types.ts";
import { formatErrorMarkdown } from "./agents/detail-format.ts";
import { formatClock, latestTimestamp } from "./agents/format.ts";
import { DEFAULT_AGENT_ORDER, getInitialSelectedRowId, getRequestedSelectedRowId } from "./agents/order.ts";
import {
  useAihubmixUsage,
  useAmpUsage,
  useAntigravityUsage,
  useClaudeUsage,
  useClinePassAccounts,
  useCodexAccounts,
  useCopilotAccounts,
  useCursorUsage,
  useDeepSeekUsage,
  useDroidUsage,
  useGeminiUsage,
  useGrokUsage,
  useKimiAccounts,
  useMiniMaxUsage,
  useMinimaxCNUsage,
  useOpencodegoUsage,
  useSyntheticAccounts,
  useZaiAccounts,
} from "./agents/provider-hooks.ts";
import type { Accessory, AgentDefinition, AgentId, AgentVisibilityPreferences, UsageState } from "./agents/types.ts";
import { getListIcon } from "./agents/ui.tsx";
import { formatAihubmixUsageText, getAihubmixAccessory, renderAihubmixDetail } from "./aihubmix/renderer.tsx";
import type { AihubmixError, AihubmixUsage } from "./aihubmix/types.ts";
import { formatAmpUsageText, getAmpAccessory, renderAmpDetail } from "./amp/renderer.tsx";
import type { AmpError, AmpUsage } from "./amp/types.ts";
import {
  formatAntigravityUsageText,
  getAntigravityAccessory,
  renderAntigravityDetail,
} from "./antigravity/renderer.tsx";
import type { AntigravityError, AntigravityUsage } from "./antigravity/types.ts";
import { formatClaudeUsageText, getClaudeAccessory, renderClaudeDetail } from "./claude/renderer.tsx";
import type { ClaudeError, ClaudeUsage } from "./claude/types.ts";
import { formatClinePassUsageText, getClinePassAccessory, renderClinePassDetail } from "./clinepass/renderer.tsx";
import type { ClinePassError, ClinePassUsage } from "./clinepass/types.ts";
import { formatCodexUsageText, getCodexAccessory, renderCodexDetail } from "./codex/renderer.tsx";
import type { CodexError, CodexUsage } from "./codex/types.ts";
import { formatCopilotUsageText, getCopilotAccessory, renderCopilotDetail } from "./copilot/renderer.tsx";
import type { CopilotError, CopilotUsage } from "./copilot/types.ts";
import { formatCursorUsageText, getCursorAccessory, renderCursorDetail } from "./cursor/renderer.tsx";
import type { CursorError, CursorUsage } from "./cursor/types.ts";
import { formatDeepSeekUsageText, getDeepSeekAccessory, renderDeepSeekDetail } from "./deepseek/renderer.tsx";
import type { DeepSeekError, DeepSeekUsage } from "./deepseek/types.ts";
import { formatDroidUsageText, getDroidAccessory, renderDroidDetail } from "./droid/renderer.tsx";
import type { DroidError, DroidUsage } from "./droid/types.ts";
import { launchGeminiReauth, shouldPromptGeminiReauth } from "./gemini/reauth.ts";
import { formatGeminiUsageText, getGeminiAccessory, renderGeminiDetail } from "./gemini/renderer.tsx";
import type { GeminiError, GeminiUsage } from "./gemini/types.ts";
import { formatGrokUsageText, getGrokAccessory, renderGrokDetail } from "./grok/renderer.tsx";
import type { GrokError, GrokUsage } from "./grok/types.ts";
import { formatKimiUsageText, getKimiAccessory, renderKimiDetail } from "./kimi/renderer.tsx";
import type { KimiError, KimiUsage } from "./kimi/types.ts";
import { formatMiniMaxUsageText, getMiniMaxAccessory, renderMiniMaxDetail } from "./minimax/renderer.tsx";
import type { MiniMaxError, MiniMaxUsage } from "./minimax/types.ts";
import { formatMinimaxCNUsageText, getMinimaxCNAccessory, renderMinimaxCNDetail } from "./minimaxcn/renderer.tsx";
import type { MinimaxCNError, MinimaxCNUsage } from "./minimaxcn/types.ts";
import { formatOpencodegoUsageText, getOpencodegoAccessory, renderOpencodegoDetail } from "./opencode-go/renderer.tsx";
import type { OpencodegoError, OpencodegoUsage } from "./opencode-go/types.ts";
import { formatSyntheticUsageText, getSyntheticAccessory, renderSyntheticDetail } from "./synthetic/renderer.tsx";
import type { SyntheticError, SyntheticUsage } from "./synthetic/types.ts";
import { formatZaiUsageText, getZaiAccessory, renderZaiDetail } from "./zai/renderer.tsx";
import type { ZaiError, ZaiUsage } from "./zai/types.ts";

const AGENT_ORDER_KEY = "agent-order";

type ErrorLike = { type: string; message: string };
type CommandLaunchContext = { selectedAgentId?: string };

interface AgentRegistryEntry<TUsage, TError extends ErrorLike> extends AgentDefinition {
  useUsage: (enabled?: boolean) => UsageState<TUsage, TError>;
  renderDetail: (usage: TUsage | null, error: TError | null) => React.ReactNode;
  getAccessory: (usage: TUsage | null, error: TError | null, isLoading: boolean) => Accessory;
  formatUsageText: (usage: TUsage | null, error: TError | null) => string;
}

/** Providers rendered from account rows — they have no single-usage hook. */
type MultiAccountAgentId = "clinepass" | "codex" | "copilot" | "kimi" | "synthetic" | "zai";

interface AgentUsageById {
  aihubmix: AihubmixUsage;
  amp: AmpUsage;
  claude: ClaudeUsage;
  clinepass: ClinePassUsage;
  codex: CodexUsage;
  copilot: CopilotUsage;
  cursor: CursorUsage;
  deepseek: DeepSeekUsage;
  droid: DroidUsage;
  gemini: GeminiUsage;
  grok: GrokUsage;
  kimi: KimiUsage;
  synthetic: SyntheticUsage;
  antigravity: AntigravityUsage;
  zai: ZaiUsage;
  minimax: MiniMaxUsage;
  minimaxcn: MinimaxCNUsage;
  "opencode-go": OpencodegoUsage;
}

interface AgentErrorById {
  aihubmix: AihubmixError;
  amp: AmpError;
  claude: ClaudeError;
  clinepass: ClinePassError;
  codex: CodexError;
  copilot: CopilotError;
  cursor: CursorError;
  deepseek: DeepSeekError;
  droid: DroidError;
  gemini: GeminiError;
  grok: GrokError;
  kimi: KimiError;
  synthetic: SyntheticError;
  antigravity: AntigravityError;
  zai: ZaiError;
  minimax: MiniMaxError;
  minimaxcn: MinimaxCNError;
  "opencode-go": OpencodegoError;
}

type AgentRegistry = {
  [K in AgentId]: K extends MultiAccountAgentId
    ? Omit<AgentRegistryEntry<AgentUsageById[K], AgentErrorById[K]>, "useUsage">
    : AgentRegistryEntry<AgentUsageById[K], AgentErrorById[K]>;
};

interface AgentView extends AgentDefinition {
  error: ErrorLike | null;
  isVisible: boolean;
  isLoading: boolean;
  revalidate: () => Promise<void>;
  getAccessory: () => Accessory;
  renderDetail: () => React.ReactNode;
  formatUsageText: () => string;
  lastFetchedAt?: number;
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
  error: ErrorLike | null;
  isVisible: boolean;
  isLoading: boolean;
  revalidate: () => Promise<void>;
  getAccessory: () => Accessory;
  renderDetail: () => React.ReactNode;
  formatUsageText: () => string;
  /** The account id, for use in the manage-accounts form */
  accountId: string;
  /** The provider key, for use in the manage-accounts form */
  provider: "clinepass" | "kimi" | "zai" | "codex" | "copilot" | "synthetic";
  /** Whether this provider is supported (always true for accounted views) */
  isSupported: boolean;
  /** The API token for this account (for copying) */
  token: string;
  /** Whether this account's token matches the one configured in OpenCode */
  isOpenCodeActive?: boolean;
  lastFetchedAt?: number;
}

const AGENT_REGISTRY: AgentRegistry = {
  aihubmix: {
    id: "aihubmix",
    name: "AIHubMix",
    icon: "aihubmix.svg",
    description: "AIHubMix API Balance",
    isSupported: true,
    settingsUrl: "https://console.aihubmix.com/statistics",
    useUsage: useAihubmixUsage,
    renderDetail: renderAihubmixDetail,
    getAccessory: getAihubmixAccessory,
    formatUsageText: formatAihubmixUsageText,
  },
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
  clinepass: {
    id: "clinepass",
    name: "ClinePass",
    icon: "clinepass-icon.svg",
    description: "ClinePass subscription",
    isSupported: true,
    settingsUrl: "https://app.cline.bot/dashboard",
    renderDetail: renderClinePassDetail,
    getAccessory: getClinePassAccessory,
    formatUsageText: formatClinePassUsageText,
  },
  codex: {
    id: "codex",
    name: "Codex",
    icon: "codex-icon.svg",
    description: "OpenAI Codex CLI",
    isSupported: true,
    settingsUrl: "https://chatgpt.com/codex/settings/usage",
    renderDetail: renderCodexDetail,
    getAccessory: getCodexAccessory,
    formatUsageText: formatCodexUsageText,
  },
  copilot: {
    id: "copilot",
    name: "Copilot",
    icon: "copilot-icon.svg",
    description: "GitHub Copilot",
    isSupported: true,
    settingsUrl: "https://github.com/settings/copilot",
    renderDetail: renderCopilotDetail,
    getAccessory: getCopilotAccessory,
    formatUsageText: formatCopilotUsageText,
  },
  cursor: {
    id: "cursor",
    name: "Cursor",
    icon: "cursor-icon.svg",
    description: "Cursor AI Code Editor",
    isSupported: true,
    settingsUrl: "https://cursor.com/dashboard?tab=usage",
    useUsage: useCursorUsage,
    renderDetail: renderCursorDetail,
    getAccessory: getCursorAccessory,
    formatUsageText: formatCursorUsageText,
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    icon: "deepseek.svg",
    description: "DeepSeek API Balance",
    isSupported: true,
    settingsUrl: "https://platform.deepseek.com/usage",
    useUsage: useDeepSeekUsage,
    renderDetail: renderDeepSeekDetail,
    getAccessory: getDeepSeekAccessory,
    formatUsageText: formatDeepSeekUsageText,
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
  grok: {
    id: "grok",
    name: "Grok",
    icon: "grok-icon.svg",
    description: "xAI Grok Build",
    isSupported: true,
    settingsUrl: "https://grok.com/?_s=usage",
    useUsage: useGrokUsage,
    renderDetail: renderGrokDetail,
    getAccessory: getGrokAccessory,
    formatUsageText: formatGrokUsageText,
  },
  antigravity: {
    id: "antigravity",
    name: "Antigravity",
    icon: "antigravity-icon.svg",
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
    renderDetail: renderKimiDetail,
    getAccessory: getKimiAccessory,
    formatUsageText: formatKimiUsageText,
  },
  synthetic: {
    id: "synthetic",
    name: "Synthetic",
    icon: "synthetic-icon.svg",
    description: "Synthetic AI",
    isSupported: true,
    settingsUrl: "https://synthetic.new/billing",
    renderDetail: renderSyntheticDetail,
    getAccessory: getSyntheticAccessory,
    formatUsageText: formatSyntheticUsageText,
  },
  zai: {
    id: "zai",
    name: "z.ai",
    icon: "zai-icon.svg",
    description: "Z.AI / GLM Coding Assistant",
    isSupported: true,
    settingsUrl: "https://z.ai",
    renderDetail: renderZaiDetail,
    getAccessory: getZaiAccessory,
    formatUsageText: formatZaiUsageText,
  },
  minimax: {
    id: "minimax",
    name: "MiniMax",
    icon: "minimax-icon.svg",
    description: "MiniMax AI Coding Assistant",
    isSupported: true,
    settingsUrl: "https://www.minimax.io",
    useUsage: useMiniMaxUsage,
    renderDetail: renderMiniMaxDetail,
    getAccessory: getMiniMaxAccessory,
    formatUsageText: formatMiniMaxUsageText,
  },
  minimaxcn: {
    id: "minimaxcn",
    name: "MinimaxCN",
    icon: "minimaxcn-icon.svg",
    description: "MinimaxCN (MiniMax 国内版) Coding Plan",
    isSupported: true,
    settingsUrl: "https://www.minimaxi.com",
    useUsage: useMinimaxCNUsage,
    renderDetail: renderMinimaxCNDetail,
    getAccessory: getMinimaxCNAccessory,
    formatUsageText: formatMinimaxCNUsageText,
  },
  "opencode-go": {
    id: "opencode-go",
    name: "OpenCode Go",
    icon: "opencode-go-icon.svg",
    description: "OpenCode Go Subscription",
    isSupported: true,
    settingsUrl: "https://opencode.ai",
    useUsage: useOpencodegoUsage,
    renderDetail: renderOpencodegoDetail,
    getAccessory: getOpencodegoAccessory,
    formatUsageText: formatOpencodegoUsageText,
  },
};

const AGENT_IDS: AgentId[] = [...DEFAULT_AGENT_ORDER];

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
    error: state.error,
    isVisible,
    isLoading: state.isLoading,
    lastFetchedAt: state.lastFetchedAt,
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
  provider: "clinepass" | "kimi" | "zai" | "codex" | "copilot" | "synthetic",
  isVisible: boolean,
  accountStates: AccountUsageState<TUsage, TError>[],
  renderDetail: (usage: TUsage | null, error: TError | null) => React.ReactNode,
  getAccessory: (usage: TUsage | null, error: TError | null, isLoading: boolean) => Accessory,
  formatUsageText: (usage: TUsage | null, error: TError | null) => string,
  formatTitle: (providerName: string, label: string) => string = getAccountedTitle,
): AccountedAgentView[] {
  return accountStates.map((state) => ({
    rowId: `${agentId}-${state.accountId}`,
    agentId,
    title: formatTitle(providerName, state.label),
    icon,
    settingsUrl,
    error: state.error,
    isVisible,
    isLoading: state.isLoading,
    lastFetchedAt: state.lastFetchedAt,
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

function getAccountedTitle(providerName: string, label: string): string {
  if (label === "Default") return providerName;
  return `${providerName} • ${label}`;
}

function getProviderName(agentId: MultiAccountAgentId): string {
  if (agentId === "clinepass") return "ClinePass";
  if (agentId === "codex") return "Codex";
  if (agentId === "copilot") return "Copilot";
  if (agentId === "kimi") return "Kimi";
  if (agentId === "zai") return "z.ai";
  return "Synthetic";
}

export default function Command(props: LaunchProps<{ launchContext: CommandLaunchContext }>) {
  const prefs = getPreferenceValues<AgentVisibilityPreferences>();
  const { push } = useNavigation();

  // Hooks must be called unconditionally at top level (React rules)
  const aihubmixState = AGENT_REGISTRY.aihubmix.useUsage(Boolean(prefs.showAihubmix));
  const ampState = AGENT_REGISTRY.amp.useUsage(Boolean(prefs.showAmp));
  const claudeState = AGENT_REGISTRY.claude.useUsage(Boolean(prefs.showClaude));
  const cursorState = AGENT_REGISTRY.cursor.useUsage(Boolean(prefs.showCursor));
  const deepseekState = AGENT_REGISTRY.deepseek.useUsage(Boolean(prefs.showDeepSeek));
  const droidState = AGENT_REGISTRY.droid.useUsage(Boolean(prefs.showDroid));
  const geminiState = AGENT_REGISTRY.gemini.useUsage(Boolean(prefs.showGemini));
  const grokState = AGENT_REGISTRY.grok.useUsage(Boolean(prefs.showGrok));
  const antigravityState = AGENT_REGISTRY.antigravity.useUsage(Boolean(prefs.showAntigravity));
  const minimaxState = AGENT_REGISTRY.minimax.useUsage(Boolean(prefs.showMinimax));
  const minimaxcnState = AGENT_REGISTRY.minimaxcn.useUsage(Boolean(prefs.showMinimaxCN));
  const opencodegoState = AGENT_REGISTRY["opencode-go"].useUsage(Boolean(prefs.showOpencodeGo));

  // Multi-account providers
  const clinePassState = useClinePassAccounts(Boolean(prefs.showClinePass));
  const codexState = useCodexAccounts(Boolean(prefs.showCodex));
  const copilotState = useCopilotAccounts(Boolean(prefs.showCopilot));
  const kimiState = useKimiAccounts(Boolean(prefs.showKimi));
  const syntheticState = useSyntheticAccounts(Boolean(prefs.showSynthetic));
  const zaiState = useZaiAccounts(Boolean(prefs.showZai));

  const agentViews: Omit<Record<AgentId, AgentView>, MultiAccountAgentId> = {
    aihubmix: createAgentView(AGENT_REGISTRY.aihubmix, aihubmixState, Boolean(prefs.showAihubmix)),
    amp: createAgentView(AGENT_REGISTRY.amp, ampState, Boolean(prefs.showAmp)),
    claude: createAgentView(AGENT_REGISTRY.claude, claudeState, Boolean(prefs.showClaude)),
    cursor: createAgentView(AGENT_REGISTRY.cursor, cursorState, Boolean(prefs.showCursor)),
    deepseek: createAgentView(AGENT_REGISTRY.deepseek, deepseekState, Boolean(prefs.showDeepSeek)),
    droid: createAgentView(AGENT_REGISTRY.droid, droidState, Boolean(prefs.showDroid)),
    gemini: createAgentView(AGENT_REGISTRY.gemini, geminiState, Boolean(prefs.showGemini)),
    grok: createAgentView(AGENT_REGISTRY.grok, grokState, Boolean(prefs.showGrok)),
    antigravity: createAgentView(AGENT_REGISTRY.antigravity, antigravityState, Boolean(prefs.showAntigravity)),
    minimax: createAgentView(AGENT_REGISTRY.minimax, minimaxState, Boolean(prefs.showMinimax)),
    minimaxcn: createAgentView(AGENT_REGISTRY.minimaxcn, minimaxcnState, Boolean(prefs.showMinimaxCN)),
    "opencode-go": createAgentView(AGENT_REGISTRY["opencode-go"], opencodegoState, Boolean(prefs.showOpencodeGo)),
  };

  const clinePassAccountedViews = createAccountedViews(
    "clinepass",
    "ClinePass",
    AGENT_REGISTRY.clinepass.icon,
    AGENT_REGISTRY.clinepass.settingsUrl,
    "clinepass",
    Boolean(prefs.showClinePass),
    clinePassState.accounts.map((state) => (state.usage ? { ...state, label: state.usage.account } : state)),
    renderClinePassDetail,
    getClinePassAccessory,
    formatClinePassUsageText,
  );

  const kimiAccountedViews = createAccountedViews(
    "kimi",
    "Kimi",
    AGENT_REGISTRY.kimi.icon,
    AGENT_REGISTRY.kimi.settingsUrl,
    "kimi",
    Boolean(prefs.showKimi),
    kimiState.accounts,
    renderKimiDetail,
    getKimiAccessory,
    formatKimiUsageText,
  );

  const copilotAccountedViews = createAccountedViews(
    "copilot",
    "Copilot",
    AGENT_REGISTRY.copilot.icon,
    AGENT_REGISTRY.copilot.settingsUrl,
    "copilot",
    Boolean(prefs.showCopilot),
    copilotState.accounts,
    renderCopilotDetail,
    getCopilotAccessory,
    formatCopilotUsageText,
  );

  const zaiAccountedViews = createAccountedViews(
    "zai",
    "z.ai",
    AGENT_REGISTRY.zai.icon,
    AGENT_REGISTRY.zai.settingsUrl,
    "zai",
    Boolean(prefs.showZai),
    zaiState.accounts,
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
    codexState.accounts.map((state) =>
      state.usage?.displayName ? { ...state, label: state.usage.displayName } : state,
    ),
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
    syntheticState.accounts,
    renderSyntheticDetail,
    getSyntheticAccessory,
    formatSyntheticUsageText,
  );

  const [agentOrder, setAgentOrder] = useState<AgentId[]>(() => [...DEFAULT_AGENT_ORDER]);
  const [hasStoredAgentOrder, setHasStoredAgentOrder] = useState(false);
  const [orderLoaded, setOrderLoaded] = useState(false);

  useEffect(() => {
    LocalStorage.getItem<string>(AGENT_ORDER_KEY).then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const validOrder = parsed.filter((id): id is AgentId => typeof id === "string" && isAgentId(id));
            if (validOrder.length > 0) {
              const missingIds = AGENT_IDS.filter((id) => !validOrder.includes(id));
              setAgentOrder([...validOrder, ...missingIds]);
              setHasStoredAgentOrder(true);
            }
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
    setHasStoredAgentOrder(true);
    await LocalStorage.setItem(AGENT_ORDER_KEY, JSON.stringify(newOrder));
  }, []);

  const resetAgentOrder = useCallback(async () => {
    await LocalStorage.removeItem(AGENT_ORDER_KEY);
    setAgentOrder([...DEFAULT_AGENT_ORDER]);
    setHasStoredAgentOrder(false);
    await showToast({
      title: "Agent Order Reset",
      message: "Restored the default alphabetical order.",
      style: Toast.Style.Success,
    });
  }, []);

  // Build a flat list of renderable items — each is either a standard AgentView or an AccountedAgentView
  type ListRow = { kind: "agent"; view: AgentView } | { kind: "accounted"; view: AccountedAgentView };

  const allRows = useMemo<ListRow[]>(
    () =>
      agentOrder.flatMap((agentId): ListRow[] => {
        if (agentId === "clinepass") {
          return clinePassAccountedViews.filter((v) => v.isVisible).map((view) => ({ kind: "accounted", view }));
        }
        if (agentId === "codex") {
          return codexAccountedViews.filter((v) => v.isVisible).map((view) => ({ kind: "accounted", view }));
        }
        if (agentId === "copilot") {
          return copilotAccountedViews.filter((v) => v.isVisible).map((view) => ({ kind: "accounted", view }));
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
    [
      agentOrder,
      clinePassAccountedViews,
      codexAccountedViews,
      copilotAccountedViews,
      kimiAccountedViews,
      syntheticAccountedViews,
      zaiAccountedViews,
      agentViews,
    ],
  );

  const requestedSelectedAgentId = props.launchContext?.selectedAgentId;
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(() =>
    getRequestedSelectedRowId(requestedSelectedAgentId),
  );

  useEffect(() => {
    if (!orderLoaded) return;

    if (allRows.length === 0) {
      if (selectedItemId !== undefined) {
        setSelectedItemId(undefined);
      }
      return;
    }

    const selectableRows = allRows.map((row) =>
      row.kind === "agent"
        ? { agentId: row.view.id, rowId: row.view.id }
        : { agentId: row.view.agentId, rowId: row.view.rowId },
    );
    const allIds = selectableRows.map((row) => row.rowId);
    if (selectedItemId && allIds.includes(selectedItemId)) return;
    setSelectedItemId(getInitialSelectedRowId(selectableRows, hasStoredAgentOrder ? agentOrder : undefined));
  }, [selectedItemId, allRows, agentOrder, hasStoredAgentOrder, orderLoaded]);

  const isLoading =
    allRows.some((row) => row.view.isLoading) ||
    [clinePassState, codexState, copilotState, kimiState, syntheticState, zaiState].some((state) => state.isLoading);

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

  // Show the clock time of the most recent fetch — a fact that doesn't tick, so
  // there's no drift as providers resolve at different times. Em-dash while rows
  // are still loading (the max fetch timestamp climbs during a staggered load).
  const latestFetchedAt = latestTimestamp(allRows.map((row) => row.view.lastFetchedAt));
  const updatedAt = !isLoading && latestFetchedAt ? formatClock(latestFetchedAt) : "—";
  const refreshTitle = `Refresh (Updated ${updatedAt})`;

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
            const errorMarkdown = agent.error ? formatErrorMarkdown(agent.error.message) : undefined;
            const canMoveUp = index > 0;
            const canMoveDown = index < allRows.length - 1;

            return (
              <List.Item
                key={agent.id}
                id={agent.id}
                icon={getListIcon(agent.icon)}
                title={agent.name}
                subtitle={agent.isSupported ? undefined : "(Coming Soon)"}
                accessories={[{ icon: accessory.icon, text: accessory.text, tooltip: accessory.tooltip }]}
                detail={<List.Item.Detail markdown={errorMarkdown} metadata={detail} />}
                actions={
                  <ActionPanel>
                    {agent.isSupported && (
                      <>
                        <Action title={refreshTitle} icon={Icon.ArrowClockwise} onAction={handleRefresh} />
                        <Action.CopyToClipboard
                          title="Copy Usage Details"
                          content={agent.formatUsageText()}
                          shortcut={Keyboard.Shortcut.Common.Copy}
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
                          shortcut={Keyboard.Shortcut.Common.MoveUp}
                          onAction={() => moveAgent(agent.id, "up")}
                        />
                      )}
                      {canMoveDown && (
                        <Action
                          title="Move Down"
                          icon={Icon.ArrowDown}
                          shortcut={Keyboard.Shortcut.Common.MoveDown}
                          onAction={() => moveAgent(agent.id, "down")}
                        />
                      )}
                      {hasStoredAgentOrder && (
                        <Action title="Reset Agent Order" icon={Icon.Undo} onAction={resetAgentOrder} />
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
            const errorMarkdown = view.error ? formatErrorMarkdown(view.error.message) : undefined;
            const canMoveUp = index > 0;
            const canMoveDown = index < allRows.length - 1;

            return (
              <List.Item
                key={view.rowId}
                id={view.rowId}
                icon={getListIcon(view.icon)}
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
                detail={<List.Item.Detail markdown={errorMarkdown} metadata={detail} />}
                actions={
                  <ActionPanel>
                    <Action title={refreshTitle} icon={Icon.ArrowClockwise} onAction={handleRefresh} />
                    <Action.CopyToClipboard
                      title="Copy Usage Details"
                      content={view.formatUsageText()}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                    {view.token && (
                      <Action.CopyToClipboard
                        title="Copy API Key"
                        content={view.token}
                        shortcut={Keyboard.Shortcut.Common.Copy}
                      />
                    )}
                    <Action
                      title="Manage Accounts"
                      icon={Icon.Person}
                      shortcut={Keyboard.Shortcut.Common.Edit}
                      onAction={() =>
                        push(
                          <ManageAccountsForm
                            provider={view.provider}
                            providerName={getProviderName(view.agentId as MultiAccountAgentId)}
                            onSave={handleRefresh}
                          />,
                        )
                      }
                    />
                    {view.settingsUrl && (
                      <Action.OpenInBrowser
                        title={`Open ${getProviderName(view.agentId as MultiAccountAgentId)} Settings`}
                        url={view.settingsUrl}
                        shortcut={Keyboard.Shortcut.Common.Open}
                      />
                    )}
                    <ActionPanel.Section title="Reorder">
                      {canMoveUp && (
                        <Action
                          title="Move Up" // eslint-disable-line @raycast/prefer-title-case
                          icon={Icon.ArrowUp}
                          shortcut={Keyboard.Shortcut.Common.MoveUp}
                          onAction={() => moveAgent(view.agentId, "up")}
                        />
                      )}
                      {canMoveDown && (
                        <Action
                          title="Move Down"
                          icon={Icon.ArrowDown}
                          shortcut={Keyboard.Shortcut.Common.MoveDown}
                          onAction={() => moveAgent(view.agentId, "down")}
                        />
                      )}
                      {hasStoredAgentOrder && (
                        <Action title="Reset Agent Order" icon={Icon.Undo} onAction={resetAgentOrder} />
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
