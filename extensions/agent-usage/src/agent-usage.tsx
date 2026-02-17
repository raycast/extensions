import { List, Action, ActionPanel, Icon, showToast, Toast, getPreferenceValues, LocalStorage } from "@raycast/api";
import { useEffect, useState, useCallback, useRef } from "react";
import { useAmpUsage } from "./amp/fetcher";
import { renderAmpDetail, getAmpAccessory, formatAmpUsageText } from "./amp/renderer";
import { useCodexUsage } from "./codex/fetcher";
import { renderCodexDetail, getCodexAccessory, formatCodexUsageText } from "./codex/renderer";
import { useDroidUsage } from "./droid/fetcher";
import { renderDroidDetail, getDroidAccessory, formatDroidUsageText } from "./droid/renderer";
import { useGeminiUsage } from "./gemini/fetcher";
import { renderGeminiDetail, getGeminiAccessory, formatGeminiUsageText } from "./gemini/renderer";
import { launchGeminiReauth, shouldPromptGeminiReauth } from "./gemini/reauth";
import { useKimiUsage } from "./kimi/fetcher";
import { renderKimiDetail, getKimiAccessory, formatKimiUsageText } from "./kimi/renderer";
import { useAntigravityUsage } from "./antigravity/fetcher";
import { renderAntigravityDetail, getAntigravityAccessory, formatAntigravityUsageText } from "./antigravity/renderer";
import { useZaiUsage } from "./zai/fetcher";
import { renderZaiDetail, getZaiAccessory, formatZaiUsageText } from "./zai/renderer";
import { AgentDefinition, Accessory, UsageState } from "./agents/types";
import { AmpError, AmpUsage } from "./amp/types";
import { CodexError, CodexUsage } from "./codex/types";
import { DroidError, DroidUsage } from "./droid/types";
import { GeminiError, GeminiUsage } from "./gemini/types";
import { KimiError, KimiUsage } from "./kimi/types";
import { AntigravityError, AntigravityUsage } from "./antigravity/types";
import { ZaiError, ZaiUsage } from "./zai/types";

const AGENT_ORDER_KEY = "agent-order";

type Preferences = Preferences.AgentUsage;

// Agent 配置定义
const AGENTS: AgentDefinition[] = [
  {
    id: "amp",
    name: "Amp",
    icon: "amp-icon.svg",
    description: "Amp Code AI Assistant",
    isSupported: true,
    settingsUrl: "https://ampcode.com/settings",
  },
  {
    id: "codex",
    name: "Codex",
    icon: "codex-icon.svg",
    description: "OpenAI Codex CLI",
    isSupported: true,
    settingsUrl: "https://chatgpt.com/codex/settings",
  },
  {
    id: "droid",
    name: "Droid",
    icon: "droid-icon.svg",
    description: "Factory AI Droid",
    isSupported: true,
    settingsUrl: "https://api.factory.ai",
  },
  {
    id: "gemini",
    name: "Gemini",
    icon: "gemini-icon.png",
    description: "Google Gemini CLI",
    isSupported: true,
  },
  {
    id: "kimi",
    name: "Kimi",
    icon: "kimi-icon.ico",
    description: "Moonshot Kimi Code",
    isSupported: true,
    settingsUrl: "https://www.kimi.com/code/console?from=membership",
  },
  {
    id: "antigravity",
    name: "Antigravity",
    icon: "antigravity-icon.png",
    description: "Google Antigravity",
    isSupported: true,
  },
  {
    id: "zai",
    name: "z.ai",
    icon: "zhipu-icon.svg",
    description: "Z.AI / GLM Coding Assistant",
    isSupported: true,
    settingsUrl: "https://z.ai",
  },
];

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

interface UsageStates {
  amp: UsageState<AmpUsage, AmpError>;
  codex: UsageState<CodexUsage, CodexError>;
  droid: UsageState<DroidUsage, DroidError>;
  gemini: UsageState<GeminiUsage, GeminiError>;
  kimi: UsageState<KimiUsage, KimiError>;
  antigravity: UsageState<AntigravityUsage, AntigravityError>;
  zai: UsageState<ZaiUsage, ZaiError>;
}

function getAgentAccessory(agent: AgentDefinition, states: UsageStates): Accessory {
  const { amp, codex, droid, gemini, kimi, antigravity, zai } = states;

  if (agent.id === "amp") {
    return getAmpAccessory(amp.usage, amp.error, amp.isLoading);
  }

  if (agent.id === "codex") {
    return getCodexAccessory(codex.usage, codex.error, codex.isLoading);
  }

  if (agent.id === "droid") {
    return getDroidAccessory(droid.usage, droid.error, droid.isLoading);
  }

  if (agent.id === "gemini") {
    return getGeminiAccessory(gemini.usage, gemini.error, gemini.isLoading);
  }

  if (agent.id === "kimi") {
    return getKimiAccessory(kimi.usage, kimi.error, kimi.isLoading);
  }

  if (agent.id === "antigravity") {
    return getAntigravityAccessory(antigravity.usage, antigravity.error, antigravity.isLoading);
  }

  if (agent.id === "zai") {
    return getZaiAccessory(zai.usage, zai.error, zai.isLoading);
  }

  return { text: "—", tooltip: "Not supported yet" };
}

function renderAgentDetail(agent: AgentDefinition, states: UsageStates): React.ReactNode {
  const { amp, codex, droid, gemini, kimi, antigravity, zai } = states;

  if (agent.id === "amp" && agent.isSupported) {
    return renderAmpDetail(amp.usage, amp.error);
  }

  if (agent.id === "codex" && agent.isSupported) {
    return renderCodexDetail(codex.usage, codex.error);
  }

  if (agent.id === "droid" && agent.isSupported) {
    return renderDroidDetail(droid.usage, droid.error);
  }

  if (agent.id === "gemini" && agent.isSupported) {
    return renderGeminiDetail(gemini.usage, gemini.error);
  }

  if (agent.id === "kimi" && agent.isSupported) {
    return renderKimiDetail(kimi.usage, kimi.error);
  }

  if (agent.id === "antigravity" && agent.isSupported) {
    return renderAntigravityDetail(antigravity.usage, antigravity.error);
  }

  if (agent.id === "zai" && agent.isSupported) {
    return renderZaiDetail(zai.usage, zai.error);
  }

  return renderUnsupportedDetail(agent);
}

function getAgentCopyText(agent: AgentDefinition, states: UsageStates): string {
  const { amp, codex, droid, gemini, kimi, antigravity, zai } = states;

  if (agent.id === "amp") {
    return formatAmpUsageText(amp.usage, amp.error);
  }
  if (agent.id === "codex") {
    return formatCodexUsageText(codex.usage, codex.error);
  }
  if (agent.id === "droid") {
    return formatDroidUsageText(droid.usage, droid.error);
  }
  if (agent.id === "gemini") {
    return formatGeminiUsageText(gemini.usage, gemini.error);
  }
  if (agent.id === "kimi") {
    return formatKimiUsageText(kimi.usage, kimi.error);
  }
  if (agent.id === "antigravity") {
    return formatAntigravityUsageText(antigravity.usage, antigravity.error);
  }
  if (agent.id === "zai") {
    return formatZaiUsageText(zai.usage, zai.error);
  }
  return `${agent.name}\nStatus: Not supported yet`;
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const ampState: UsageState<AmpUsage, AmpError> = useAmpUsage();
  const codexState: UsageState<CodexUsage, CodexError> = useCodexUsage();
  const droidState: UsageState<DroidUsage, DroidError> = useDroidUsage();
  const geminiState: UsageState<GeminiUsage, GeminiError> = useGeminiUsage();
  const kimiState: UsageState<KimiUsage, KimiError> = useKimiUsage();
  const antigravityState: UsageState<AntigravityUsage, AntigravityError> = useAntigravityUsage();
  const zaiState: UsageState<ZaiUsage, ZaiError> = useZaiUsage();

  const [agentOrder, setAgentOrder] = useState<string[]>(AGENTS.map((a) => a.id));

  useEffect(() => {
    LocalStorage.getItem<string>(AGENT_ORDER_KEY).then((stored) => {
      if (stored) {
        try {
          const order = JSON.parse(stored) as string[];
          const validOrder = order.filter((id) => AGENTS.some((a) => a.id === id));
          const missingIds = AGENTS.map((a) => a.id).filter((id) => !validOrder.includes(id));
          setAgentOrder([...validOrder, ...missingIds]);
        } catch {
          setAgentOrder(AGENTS.map((a) => a.id));
        }
      }
    });
  }, []);

  const saveOrder = useCallback(async (newOrder: string[]) => {
    setAgentOrder(newOrder);
    await LocalStorage.setItem(AGENT_ORDER_KEY, JSON.stringify(newOrder));
  }, []);

  const visibilityMap: Record<string, boolean> = {
    amp: prefs.showAmp,
    codex: prefs.showCodex,
    droid: prefs.showDroid,
    gemini: prefs.showGemini,
    kimi: prefs.showKimi,
    antigravity: prefs.showAntigravity,
    zai: prefs.showZai,
  };

  const sortedAgents = agentOrder
    .map((id) => AGENTS.find((a) => a.id === id))
    .filter((a): a is AgentDefinition => a !== undefined);
  const visibleAgents = sortedAgents.filter((agent) => visibilityMap[agent.id]);

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
    async (agentId: string, direction: "up" | "down") => {
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
    <List isLoading={isLoading} isShowingDetail>
      {visibleAgents.map((agent, index) => {
        const accessory = getAgentAccessory(agent, {
          amp: ampState,
          codex: codexState,
          droid: droidState,
          gemini: geminiState,
          kimi: kimiState,
          antigravity: antigravityState,
          zai: zaiState,
        });
        const detail = renderAgentDetail(agent, {
          amp: ampState,
          codex: codexState,
          droid: droidState,
          gemini: geminiState,
          kimi: kimiState,
          antigravity: antigravityState,
          zai: zaiState,
        });

        const canMoveUp = index > 0;
        const canMoveDown = index < visibleAgents.length - 1;

        return (
          <List.Item
            key={agent.id}
            id={agent.id}
            icon={agent.icon}
            title={agent.name}
            subtitle={agent.isSupported ? undefined : "(Coming Soon)"}
            accessories={[{ text: accessory.text, tooltip: accessory.tooltip }]}
            detail={<List.Item.Detail metadata={detail} />}
            actions={
              <ActionPanel>
                {agent.isSupported && (
                  <>
                    <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={handleRefresh} />
                    <Action.CopyToClipboard
                      title="Copy Usage Details"
                      content={getAgentCopyText(agent, {
                        amp: ampState,
                        codex: codexState,
                        droid: droidState,
                        gemini: geminiState,
                        kimi: kimiState,
                        antigravity: antigravityState,
                        zai: zaiState,
                      })}
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
