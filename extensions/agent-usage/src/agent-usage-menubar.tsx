import {
  getPreferenceValues,
  Icon,
  LaunchType,
  MenuBarExtra,
  launchCommand,
  openCommandPreferences,
  showHUD,
} from "@raycast/api";
import type { Image } from "@raycast/api";
import { useMemo } from "react";
import type { AgentId, Accessory } from "./agents/types";
import { getThemeIcon } from "./agents/ui";
import { formatClock, latestTimestamp } from "./agents/format";
import {
  useAmpUsage,
  useAntigravityUsage,
  useClaudeUsage,
  useCodexAccounts,
  useCopilotUsage,
  useCursorUsage,
  useDroidUsage,
  useGeminiUsage,
  useGrokUsage,
  useKimiAccounts,
  useMiniMaxUsage,
  useOpencodegoUsage,
  useSyntheticAccounts,
  useZaiAccounts,
} from "./agents/provider-hooks";
import { getAmpAccessory } from "./amp/renderer";
import { getAntigravityAccessory } from "./antigravity/renderer";
import { getClaudeAccessory } from "./claude/renderer";
import { getCodexAccessory } from "./codex/renderer";
import { getCopilotAccessory } from "./copilot/renderer";
import { getCursorAccessory } from "./cursor/renderer";
import { getDroidAccessory } from "./droid/renderer";
import { getGeminiAccessory } from "./gemini/renderer";
import { getGrokAccessory } from "./grok/renderer";
import { getKimiAccessory } from "./kimi/renderer";
import { getSyntheticAccessory } from "./synthetic/renderer";
import { getZaiAccessory } from "./zai/renderer";
import { getMiniMaxAccessory } from "./minimax/renderer";
import { getOpencodegoAccessory } from "./opencode-go/renderer";

interface MenuBarAgent {
  id: AgentId;
  name: string;
  icon: Image.ImageLike;
  visible: boolean;
  isLoading: boolean;
  accessory: Accessory;
  revalidate: () => Promise<void>;
  lastFetchedAt?: number;
  /** True if this account's token matches the one configured in OpenCode */
  isOpenCodeActive?: boolean;
}

type Preferences = Preferences.AgentUsageMenubar;

function getMenuItemTitle(name: string, value: string, isLoading: boolean, isOpenCodeActive?: boolean): string {
  const prefix = isOpenCodeActive ? "⚡ " : "";
  if (isLoading || !value) {
    return `${prefix}${name}`;
  }
  return `${prefix}${name}  ${value}`;
}

function getMenuItemTooltip(usageTooltip?: string): string {
  const actionHint = "Click to open details";
  return usageTooltip ? `${usageTooltip}\n${actionHint}` : actionHint;
}

export default function MenuBarCommand() {
  const prefs = getPreferenceValues<Preferences>();

  const isAmpVisible = Boolean(prefs.showAmp);
  const isClaudeVisible = Boolean(prefs.showClaude);
  const isCodexVisible = Boolean(prefs.showCodex);
  const isCopilotVisible = Boolean(prefs.showCopilot);
  const isCursorVisible = Boolean(prefs.showCursor);
  const isDroidVisible = Boolean(prefs.showDroid);
  const isGeminiVisible = Boolean(prefs.showGemini);
  const isGrokVisible = Boolean(prefs.showGrok);
  const isKimiVisible = Boolean(prefs.showKimi);
  const isSyntheticVisible = Boolean(prefs.showSynthetic);
  const isAntigravityVisible = Boolean(prefs.showAntigravity);
  const isZaiVisible = Boolean(prefs.showZai);
  const isMinimaxVisible = Boolean(prefs.showMinimax);
  const isOpencodeGoVisible = Boolean(prefs.showOpencodeGo);

  const ampState = useAmpUsage(isAmpVisible);
  const claudeState = useClaudeUsage(isClaudeVisible);
  const codexState = useCodexAccounts(isCodexVisible);
  const copilotState = useCopilotUsage(isCopilotVisible);
  const cursorState = useCursorUsage(isCursorVisible);
  const droidState = useDroidUsage(isDroidVisible);
  const geminiState = useGeminiUsage(isGeminiVisible);
  const grokState = useGrokUsage(isGrokVisible);
  const kimiState = useKimiAccounts(isKimiVisible);
  const syntheticState = useSyntheticAccounts(isSyntheticVisible);
  const antigravityState = useAntigravityUsage(isAntigravityVisible);
  const zaiState = useZaiAccounts(isZaiVisible);
  const minimaxState = useMiniMaxUsage(isMinimaxVisible);
  const opencodegoState = useOpencodegoUsage(isOpencodeGoVisible);

  // Single-account agents - memoized to prevent unnecessary re-renders
  const singleAgents = useMemo<MenuBarAgent[]>(
    () => [
      {
        id: "amp",
        name: "Amp",
        icon: getThemeIcon("amp-icon.svg"),
        visible: isAmpVisible,
        isLoading: ampState.isLoading,
        accessory: getAmpAccessory(ampState.usage, ampState.error, ampState.isLoading),
        revalidate: ampState.revalidate,
        lastFetchedAt: ampState.lastFetchedAt,
      },
      {
        id: "claude",
        name: "Claude",
        icon: getThemeIcon("claude-icon.svg"),
        visible: isClaudeVisible,
        isLoading: claudeState.isLoading,
        accessory: getClaudeAccessory(claudeState.usage, claudeState.error, claudeState.isLoading),
        revalidate: claudeState.revalidate,
        lastFetchedAt: claudeState.lastFetchedAt,
      },
      {
        id: "copilot",
        name: "Copilot",
        icon: getThemeIcon("copilot-icon.svg"),
        visible: isCopilotVisible,
        isLoading: copilotState.isLoading,
        accessory: getCopilotAccessory(copilotState.usage, copilotState.error, copilotState.isLoading),
        revalidate: copilotState.revalidate,
        lastFetchedAt: copilotState.lastFetchedAt,
      },
      {
        id: "cursor",
        name: "Cursor",
        icon: getThemeIcon("cursor-icon.svg"),
        visible: isCursorVisible,
        isLoading: cursorState.isLoading,
        accessory: getCursorAccessory(cursorState.usage, cursorState.error, cursorState.isLoading),
        revalidate: cursorState.revalidate,
        lastFetchedAt: cursorState.lastFetchedAt,
      },
      {
        id: "droid",
        name: "Droid",
        icon: getThemeIcon("droid-icon.svg"),
        visible: isDroidVisible,
        isLoading: droidState.isLoading,
        accessory: getDroidAccessory(droidState.usage, droidState.error, droidState.isLoading),
        revalidate: droidState.revalidate,
        lastFetchedAt: droidState.lastFetchedAt,
      },
      {
        id: "gemini",
        name: "Gemini",
        icon: getThemeIcon("gemini-icon.png"),
        visible: isGeminiVisible,
        isLoading: geminiState.isLoading,
        accessory: getGeminiAccessory(geminiState.usage, geminiState.error, geminiState.isLoading),
        revalidate: geminiState.revalidate,
        lastFetchedAt: geminiState.lastFetchedAt,
      },
      {
        id: "grok",
        name: "Grok",
        icon: getThemeIcon("grok-icon.svg"),
        visible: isGrokVisible,
        isLoading: grokState.isLoading,
        accessory: getGrokAccessory(grokState.usage, grokState.error, grokState.isLoading),
        revalidate: grokState.revalidate,
        lastFetchedAt: grokState.lastFetchedAt,
      },
      {
        id: "antigravity",
        name: "Antigravity",
        icon: getThemeIcon("antigravity-icon.svg"),
        visible: isAntigravityVisible,
        isLoading: antigravityState.isLoading,
        accessory: getAntigravityAccessory(antigravityState.usage, antigravityState.error, antigravityState.isLoading),
        revalidate: antigravityState.revalidate,
        lastFetchedAt: antigravityState.lastFetchedAt,
      },
      {
        id: "minimax",
        name: "MiniMax",
        icon: getThemeIcon("minimax-icon.svg"),
        visible: isMinimaxVisible,
        isLoading: minimaxState.isLoading,
        accessory: getMiniMaxAccessory(minimaxState.usage, minimaxState.error, minimaxState.isLoading),
        revalidate: minimaxState.revalidate,
        lastFetchedAt: minimaxState.lastFetchedAt,
      },
      {
        id: "opencode-go",
        name: "OpenCode Go",
        icon: getThemeIcon("opencode-go-icon.svg"),
        visible: isOpencodeGoVisible,
        isLoading: opencodegoState.isLoading,
        accessory: getOpencodegoAccessory(opencodegoState.usage, opencodegoState.error, opencodegoState.isLoading),
        revalidate: opencodegoState.revalidate,
        lastFetchedAt: opencodegoState.lastFetchedAt,
      },
    ],
    [
      isAmpVisible,
      isClaudeVisible,
      isCopilotVisible,
      isCursorVisible,
      isDroidVisible,
      isGeminiVisible,
      isGrokVisible,
      isAntigravityVisible,
      ampState.isLoading,
      ampState.usage,
      ampState.error,
      ampState.revalidate,
      ampState.lastFetchedAt,
      claudeState.isLoading,
      claudeState.usage,
      claudeState.error,
      claudeState.revalidate,
      claudeState.lastFetchedAt,
      copilotState.isLoading,
      copilotState.usage,
      copilotState.error,
      copilotState.revalidate,
      copilotState.lastFetchedAt,
      cursorState.isLoading,
      cursorState.usage,
      cursorState.error,
      cursorState.revalidate,
      cursorState.lastFetchedAt,
      droidState.isLoading,
      droidState.usage,
      droidState.error,
      droidState.revalidate,
      droidState.lastFetchedAt,
      geminiState.isLoading,
      geminiState.usage,
      geminiState.error,
      geminiState.revalidate,
      geminiState.lastFetchedAt,
      grokState.isLoading,
      grokState.usage,
      grokState.error,
      grokState.revalidate,
      grokState.lastFetchedAt,
      antigravityState.isLoading,
      antigravityState.usage,
      antigravityState.error,
      antigravityState.revalidate,
      antigravityState.lastFetchedAt,
      minimaxState.isLoading,
      minimaxState.usage,
      minimaxState.error,
      minimaxState.revalidate,
      minimaxState.lastFetchedAt,
      isOpencodeGoVisible,
      opencodegoState.isLoading,
      opencodegoState.usage,
      opencodegoState.error,
      opencodegoState.revalidate,
      opencodegoState.lastFetchedAt,
    ],
  );

  // Multi-account agents - memoized to prevent unnecessary re-renders
  const codexAgents = useMemo<MenuBarAgent[]>(() => {
    if (!isCodexVisible) return [];
    if (codexState.isLoading) {
      return [
        {
          id: "codex" as AgentId,
          name: "Codex",
          icon: getThemeIcon("codex-icon.svg"),
          visible: true,
          isLoading: true,
          accessory: getCodexAccessory(null, null, true),
          revalidate: codexState.revalidate,
        },
      ];
    }
    return codexState.accounts.map((account) => ({
      id: `codex-${account.accountId}` as AgentId,
      name: account.label === "Default" ? "Codex" : `Codex • ${account.label}`,
      icon: getThemeIcon("codex-icon.svg"),
      visible: true,
      isLoading: account.isLoading,
      accessory: getCodexAccessory(account.usage, account.error, account.isLoading),
      revalidate: account.revalidate,
      isOpenCodeActive: account.isOpenCodeActive,
      lastFetchedAt: account.lastFetchedAt,
    }));
  }, [isCodexVisible, codexState]);

  const kimiAgents = useMemo<MenuBarAgent[]>(() => {
    if (!isKimiVisible) return [];
    if (kimiState.isLoading) {
      return [
        {
          id: "kimi" as AgentId,
          name: "Kimi",
          icon: getThemeIcon("kimi-icon.ico"),
          visible: true,
          isLoading: true,
          accessory: getKimiAccessory(null, null, true),
          revalidate: kimiState.revalidate,
        },
      ];
    }
    return kimiState.accounts.map((account) => ({
      id: `kimi-${account.accountId}` as AgentId,
      name: account.label === "Default" ? "Kimi" : `Kimi • ${account.label}`,
      icon: getThemeIcon("kimi-icon.ico"),
      visible: true,
      isLoading: account.isLoading,
      accessory: getKimiAccessory(account.usage, account.error, account.isLoading),
      revalidate: account.revalidate,
      isOpenCodeActive: account.isOpenCodeActive,
      lastFetchedAt: account.lastFetchedAt,
    }));
  }, [isKimiVisible, kimiState]);

  const syntheticAgents = useMemo<MenuBarAgent[]>(() => {
    if (!isSyntheticVisible) return [];
    if (syntheticState.isLoading) {
      return [
        {
          id: "synthetic" as AgentId,
          name: "Synthetic",
          icon: getThemeIcon("synthetic-icon.svg"),
          visible: true,
          isLoading: true,
          accessory: getSyntheticAccessory(null, null, true),
          revalidate: syntheticState.revalidate,
        },
      ];
    }
    return syntheticState.accounts.map((account) => ({
      id: `synthetic-${account.accountId}` as AgentId,
      name: account.label === "Default" ? "Synthetic" : `Synthetic • ${account.label}`,
      icon: getThemeIcon("synthetic-icon.svg"),
      visible: true,
      isLoading: account.isLoading,
      accessory: getSyntheticAccessory(account.usage, account.error, account.isLoading),
      revalidate: account.revalidate,
      isOpenCodeActive: account.isOpenCodeActive,
      lastFetchedAt: account.lastFetchedAt,
    }));
  }, [isSyntheticVisible, syntheticState]);

  const zaiAgents = useMemo<MenuBarAgent[]>(() => {
    if (!isZaiVisible) return [];
    if (zaiState.isLoading) {
      return [
        {
          id: "zai" as AgentId,
          name: "z.ai",
          icon: getThemeIcon("zai-icon.svg"),
          visible: true,
          isLoading: true,
          accessory: getZaiAccessory(null, null, true),
          revalidate: zaiState.revalidate,
        },
      ];
    }
    return zaiState.accounts.map((account) => ({
      id: `zai-${account.accountId}` as AgentId,
      name: account.label === "Default" ? "z.ai" : `z.ai • ${account.label}`,
      icon: getThemeIcon("zai-icon.svg"),
      visible: true,
      isLoading: account.isLoading,
      accessory: getZaiAccessory(account.usage, account.error, account.isLoading),
      revalidate: account.revalidate,
      isOpenCodeActive: account.isOpenCodeActive,
      lastFetchedAt: account.lastFetchedAt,
    }));
  }, [isZaiVisible, zaiState]);

  const visibleAgents = useMemo(
    () => [...singleAgents, ...codexAgents, ...kimiAgents, ...syntheticAgents, ...zaiAgents].filter((a) => a.visible),
    [singleAgents, codexAgents, kimiAgents, syntheticAgents, zaiAgents],
  );
  const isLoading = visibleAgents.some((agent) => agent.isLoading);

  const handleRefresh = async () => {
    await Promise.all(visibleAgents.map((a) => a.revalidate()));
    await showHUD("Agent Usage Refreshed");
  };

  // Show the clock time of the most recent fetch. A clock time is a fact that
  // doesn't need to tick, which suits a menu-bar command (it renders, settles,
  // and idles until the next background refresh). Em-dash until the first fetch
  // lands or while a refresh is mid-flight.
  const latestFetchedAt = latestTimestamp(visibleAgents.map((agent) => agent.lastFetchedAt));
  const updatedAt = !isLoading && latestFetchedAt ? formatClock(latestFetchedAt) : "—";
  const refreshTitle = `Refresh All (Updated ${updatedAt})`;

  return (
    <MenuBarExtra icon="extension-icon.png" isLoading={isLoading} tooltip="Agent Usage">
      <MenuBarExtra.Section>
        {visibleAgents.map((agent) => (
          <MenuBarExtra.Item
            key={agent.id}
            icon={agent.icon}
            title={getMenuItemTitle(agent.name, agent.accessory.text, agent.isLoading, agent.isOpenCodeActive)}
            tooltip={getMenuItemTooltip(agent.accessory.tooltip)}
            onAction={() =>
              launchCommand({
                name: "agent-usage",
                type: LaunchType.UserInitiated,
                context: { selectedAgentId: agent.id },
              })
            }
          />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={refreshTitle}
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={handleRefresh}
        />
        <MenuBarExtra.Item
          title="Open Agent Usage"
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => launchCommand({ name: "agent-usage", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Configure Command"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
