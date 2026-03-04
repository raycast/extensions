import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  LaunchProps,
  List,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Accessory, AgentDefinition, AgentId, UsageState } from "./agents/types";
import { useAmpUsage } from "./amp/fetcher";
import { formatAmpUsageText, getAmpAccessory, renderAmpDetail } from "./amp/renderer";
import type { AmpError, AmpUsage } from "./amp/types";
import { useAntigravityUsage } from "./antigravity/fetcher";
import { formatAntigravityUsageText, getAntigravityAccessory, renderAntigravityDetail } from "./antigravity/renderer";
import type { AntigravityError, AntigravityUsage } from "./antigravity/types";
import { useCodexUsage } from "./codex/fetcher";
import { formatCodexUsageText, getCodexAccessory, renderCodexDetail } from "./codex/renderer";
import type { CodexError, CodexUsage } from "./codex/types";
import { useDroidUsage } from "./droid/fetcher";
import { formatDroidUsageText, getDroidAccessory, renderDroidDetail } from "./droid/renderer";
import type { DroidError, DroidUsage } from "./droid/types";
import { useGeminiUsage } from "./gemini/fetcher";
import { launchGeminiReauth, shouldPromptGeminiReauth } from "./gemini/reauth";
import { formatGeminiUsageText, getGeminiAccessory, renderGeminiDetail } from "./gemini/renderer";
import type { GeminiError, GeminiUsage } from "./gemini/types";
import { useKimiUsage } from "./kimi/fetcher";
import { formatKimiUsageText, getKimiAccessory, renderKimiDetail } from "./kimi/renderer";
import type { KimiError, KimiUsage } from "./kimi/types";
import { useZaiUsage } from "./zai/fetcher";
import { formatZaiUsageText, getZaiAccessory, renderZaiDetail } from "./zai/renderer";
import type { ZaiError, ZaiUsage } from "./zai/types";

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
  codex: CodexUsage;
  droid: DroidUsage;
  gemini: GeminiUsage;
  kimi: KimiUsage;
  antigravity: AntigravityUsage;
  zai: ZaiUsage;
}

interface AgentErrorById {
  amp: AmpError;
  codex: CodexError;
  droid: DroidError;
  gemini: GeminiError;
  kimi: KimiError;
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

function renderUnsupportedDetail(agent: AgentDefinition): React.ReactNode {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Agent" text={agent.name} />
      <List.Item.Detail.Metadata.Label title="Status" text="Coming Soon" />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Description" text={agent.description} />
    </List.Item.Detail.Metadata>
  );
}

export default function Command(props: LaunchProps<{ launchContext: CommandLaunchContext }>) {
  const prefs = getPreferenceValues<Preferences>();

  // Hooks must be called unconditionally at top level (React rules)
  const ampState = AGENT_REGISTRY.amp.useUsage(Boolean(prefs.showAmp));
  const codexState = AGENT_REGISTRY.codex.useUsage(Boolean(prefs.showCodex));
  const droidState = AGENT_REGISTRY.droid.useUsage(Boolean(prefs.showDroid));
  const geminiState = AGENT_REGISTRY.gemini.useUsage(Boolean(prefs.showGemini));
  const kimiState = AGENT_REGISTRY.kimi.useUsage(Boolean(prefs.showKimi));
  const antigravityState = AGENT_REGISTRY.antigravity.useUsage(Boolean(prefs.showAntigravity));
  const zaiState = AGENT_REGISTRY.zai.useUsage(Boolean(prefs.showZai));

  const agentViews: Record<AgentId, AgentView> = {
    amp: createAgentView(AGENT_REGISTRY.amp, ampState, Boolean(prefs.showAmp)),
    codex: createAgentView(AGENT_REGISTRY.codex, codexState, Boolean(prefs.showCodex)),
    droid: createAgentView(AGENT_REGISTRY.droid, droidState, Boolean(prefs.showDroid)),
    gemini: createAgentView(AGENT_REGISTRY.gemini, geminiState, Boolean(prefs.showGemini)),
    kimi: createAgentView(AGENT_REGISTRY.kimi, kimiState, Boolean(prefs.showKimi)),
    antigravity: createAgentView(AGENT_REGISTRY.antigravity, antigravityState, Boolean(prefs.showAntigravity)),
    zai: createAgentView(AGENT_REGISTRY.zai, zaiState, Boolean(prefs.showZai)),
  };

  const [agentOrder, setAgentOrder] = useState<AgentId[]>(AGENT_IDS);

  useEffect(() => {
    LocalStorage.getItem<string>(AGENT_ORDER_KEY).then((stored) => {
      if (!stored) {
        return;
      }

      try {
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) {
          setAgentOrder(AGENT_IDS);
          return;
        }

        const validOrder = parsed.filter((id): id is AgentId => typeof id === "string" && isAgentId(id));
        const missingIds = AGENT_IDS.filter((id) => !validOrder.includes(id));
        setAgentOrder([...validOrder, ...missingIds]);
      } catch {
        setAgentOrder(AGENT_IDS);
      }
    });
  }, []);

  const saveOrder = useCallback(async (newOrder: AgentId[]) => {
    setAgentOrder(newOrder);
    await LocalStorage.setItem(AGENT_ORDER_KEY, JSON.stringify(newOrder));
  }, []);

  const orderedAgentViews = agentOrder.map((agentId) => agentViews[agentId]);
  const visibleAgentViews = orderedAgentViews.filter((agent) => agent.isVisible);
  const requestedSelectedAgentId = props.launchContext?.selectedAgentId;
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(() =>
    typeof requestedSelectedAgentId === "string" && isAgentId(requestedSelectedAgentId)
      ? requestedSelectedAgentId
      : undefined,
  );

  useEffect(() => {
    if (visibleAgentViews.length === 0) {
      if (selectedItemId !== undefined) {
        setSelectedItemId(undefined);
      }
      return;
    }

    if (selectedItemId && visibleAgentViews.some((agent) => agent.id === selectedItemId)) {
      return;
    }

    setSelectedItemId(visibleAgentViews[0].id);
  }, [selectedItemId, visibleAgentViews]);

  const isLoading =
    ampState.isLoading ||
    codexState.isLoading ||
    droidState.isLoading ||
    geminiState.isLoading ||
    kimiState.isLoading ||
    antigravityState.isLoading ||
    zaiState.isLoading;

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

    if (shouldPromptGeminiReauth(errorType, hasPromptedGeminiReauth.current)) {
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
  }, [geminiState.error?.type, handleGeminiReauth]);

  const handleRefresh = async () => {
    await Promise.all([
      ampState.revalidate(),
      codexState.revalidate(),
      droidState.revalidate(),
      geminiState.revalidate(),
      kimiState.revalidate(),
      antigravityState.revalidate(),
      zaiState.revalidate(),
    ]);
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
      isLoading={isLoading}
      isShowingDetail
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => setSelectedItemId(id ?? undefined)}
    >
      {visibleAgentViews.map((agent, index) => {
        const accessory = agent.getAccessory();
        const detail = agent.isSupported ? agent.renderDetail() : renderUnsupportedDetail(agent);

        const canMoveUp = index > 0;
        const canMoveDown = index < visibleAgentViews.length - 1;

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
                      <Action.OpenInBrowser title={`Open ${agent.name} Settings`} url={agent.settingsUrl} />
                    )}
                  </>
                )}
                <ActionPanel.Section title="Reorder">
                  {canMoveUp && (
                    <Action
                      title="Move Up"
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
      })}
    </List>
  );
}
