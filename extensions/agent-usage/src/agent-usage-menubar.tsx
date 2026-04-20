import {
  environment,
  getPreferenceValues,
  Icon,
  LaunchType,
  MenuBarExtra,
  launchCommand,
  openCommandPreferences,
  showHUD,
} from "@raycast/api";
import { useEffect, useMemo, useRef } from "react";
import type { AgentId, Accessory } from "./agents/types";
import { useAmpUsage } from "./amp/fetcher";
import { getAmpAccessory } from "./amp/renderer";
import { useAntigravityUsage } from "./antigravity/fetcher";
import { getAntigravityAccessory } from "./antigravity/renderer";
import { useClaudeUsage } from "./claude/fetcher";
import { getClaudeAccessory } from "./claude/renderer";
import { useCodexAccounts } from "./codex/fetcher";
import { getCodexAccessory } from "./codex/renderer";
import { useCopilotUsage } from "./copilot/fetcher";
import { getCopilotAccessory } from "./copilot/renderer";
import { useDroidUsage } from "./droid/fetcher";
import { getDroidAccessory } from "./droid/renderer";
import { useGeminiUsage } from "./gemini/fetcher";
import { getGeminiAccessory } from "./gemini/renderer";
import { useKimiAccounts } from "./kimi/fetcher";
import { getKimiAccessory } from "./kimi/renderer";
import { useSyntheticAccounts } from "./synthetic/fetcher";
import { getSyntheticAccessory } from "./synthetic/renderer";
import { useZaiAccounts } from "./zai/fetcher";
import { getZaiAccessory } from "./zai/renderer";

interface MenuBarAgent {
  id: AgentId;
  name: string;
  icon: string;
  visible: boolean;
  isLoading: boolean;
  accessory: Accessory;
  revalidate: () => Promise<void>;
  /** True if this account's token matches the one configured in OpenCode */
  isOpenCodeActive?: boolean;
}

type Preferences = Preferences.AgentUsageMenubar;

function getMenuItemTitle(name: string, value: string, isOpenCodeActive?: boolean): string {
  return value ? `${isOpenCodeActive ? "⚡ " : ""}${name}  ${value}` : name;
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
  const isDroidVisible = Boolean(prefs.showDroid);
  const isGeminiVisible = Boolean(prefs.showGemini);
  const isKimiVisible = Boolean(prefs.showKimi);
  const isSyntheticVisible = Boolean(prefs.showSynthetic);
  const isAntigravityVisible = Boolean(prefs.showAntigravity);
  const isZaiVisible = Boolean(prefs.showZai);

  const ampState = useAmpUsage(isAmpVisible);
  const claudeState = useClaudeUsage(isClaudeVisible);
  const codexAccounts = useCodexAccounts(isCodexVisible);
  const copilotState = useCopilotUsage(isCopilotVisible);
  const droidState = useDroidUsage(isDroidVisible);
  const geminiState = useGeminiUsage(isGeminiVisible);
  const kimiAccounts = useKimiAccounts(isKimiVisible);
  const syntheticAccounts = useSyntheticAccounts(isSyntheticVisible);
  const antigravityState = useAntigravityUsage(isAntigravityVisible);
  const zaiAccounts = useZaiAccounts(isZaiVisible);

  // Single-account agents - memoized to prevent unnecessary re-renders
  const singleAgents = useMemo<MenuBarAgent[]>(
    () => [
      {
        id: "amp",
        name: "Amp",
        icon: "amp-icon.svg",
        visible: isAmpVisible,
        isLoading: ampState.isLoading,
        accessory: getAmpAccessory(ampState.usage, ampState.error, ampState.isLoading),
        revalidate: ampState.revalidate,
      },
      {
        id: "claude",
        name: "Claude",
        icon: "claude-icon.svg",
        visible: isClaudeVisible,
        isLoading: claudeState.isLoading,
        accessory: getClaudeAccessory(claudeState.usage, claudeState.error, claudeState.isLoading),
        revalidate: claudeState.revalidate,
      },
      {
        id: "copilot",
        name: "Copilot",
        icon: "copilot-icon.svg",
        visible: isCopilotVisible,
        isLoading: copilotState.isLoading,
        accessory: getCopilotAccessory(copilotState.usage, copilotState.error, copilotState.isLoading),
        revalidate: copilotState.revalidate,
      },
      {
        id: "droid",
        name: "Droid",
        icon: "droid-icon.svg",
        visible: isDroidVisible,
        isLoading: droidState.isLoading,
        accessory: getDroidAccessory(droidState.usage, droidState.error, droidState.isLoading),
        revalidate: droidState.revalidate,
      },
      {
        id: "gemini",
        name: "Gemini",
        icon: "gemini-icon.png",
        visible: isGeminiVisible,
        isLoading: geminiState.isLoading,
        accessory: getGeminiAccessory(geminiState.usage, geminiState.error, geminiState.isLoading),
        revalidate: geminiState.revalidate,
      },
      {
        id: "antigravity",
        name: "Antigravity",
        icon: "antigravity-icon.png",
        visible: isAntigravityVisible,
        isLoading: antigravityState.isLoading,
        accessory: getAntigravityAccessory(antigravityState.usage, antigravityState.error, antigravityState.isLoading),
        revalidate: antigravityState.revalidate,
      },
    ],
    [
      isAmpVisible,
      isClaudeVisible,
      isCopilotVisible,
      isDroidVisible,
      isGeminiVisible,
      isAntigravityVisible,
      ampState.isLoading,
      ampState.usage,
      ampState.error,
      ampState.revalidate,
      claudeState.isLoading,
      claudeState.usage,
      claudeState.error,
      claudeState.revalidate,
      copilotState.isLoading,
      copilotState.usage,
      copilotState.error,
      copilotState.revalidate,
      droidState.isLoading,
      droidState.usage,
      droidState.error,
      droidState.revalidate,
      geminiState.isLoading,
      geminiState.usage,
      geminiState.error,
      geminiState.revalidate,
      antigravityState.isLoading,
      antigravityState.usage,
      antigravityState.error,
      antigravityState.revalidate,
    ],
  );

  // Multi-account agents - memoized to prevent unnecessary re-renders
  const codexAgents = useMemo<MenuBarAgent[]>(
    () =>
      isCodexVisible
        ? codexAccounts.map((account) => ({
            id: `codex-${account.accountId}` as AgentId,
            name: account.label === "Default" ? "Codex" : `Codex • ${account.label}`,
            icon: "codex-icon.svg",
            visible: isCodexVisible,
            isLoading: account.isLoading,
            accessory: getCodexAccessory(account.usage, account.error, account.isLoading),
            revalidate: account.revalidate,
            isOpenCodeActive: account.isOpenCodeActive,
          }))
        : [],
    [isCodexVisible, codexAccounts],
  );

  const kimiAgents = useMemo<MenuBarAgent[]>(
    () =>
      isKimiVisible
        ? kimiAccounts.map((account) => ({
            id: `kimi-${account.accountId}` as AgentId,
            name: account.label === "Default" ? "Kimi" : `Kimi • ${account.label}`,
            icon: "kimi-icon.ico",
            visible: isKimiVisible,
            isLoading: account.isLoading,
            accessory: getKimiAccessory(account.usage, account.error, account.isLoading),
            revalidate: account.revalidate,
            isOpenCodeActive: account.isOpenCodeActive,
          }))
        : [],
    [isKimiVisible, kimiAccounts],
  );

  const syntheticAgents = useMemo<MenuBarAgent[]>(
    () =>
      isSyntheticVisible
        ? syntheticAccounts.map((account) => ({
            id: `synthetic-${account.accountId}` as AgentId,
            name: account.label === "Default" ? "Synthetic" : `Synthetic • ${account.label}`,
            icon: "synthetic-icon.png",
            visible: isSyntheticVisible,
            isLoading: account.isLoading,
            accessory: getSyntheticAccessory(account.usage, account.error, account.isLoading),
            revalidate: account.revalidate,
            isOpenCodeActive: account.isOpenCodeActive,
          }))
        : [],
    [isSyntheticVisible, syntheticAccounts],
  );

  const zaiAgents = useMemo<MenuBarAgent[]>(
    () =>
      isZaiVisible
        ? zaiAccounts.map((account) => ({
            id: `zai-${account.accountId}` as AgentId,
            name: account.label === "Default" ? "z.ai" : `z.ai • ${account.label}`,
            icon: "zhipu-icon.svg",
            visible: isZaiVisible,
            isLoading: account.isLoading,
            accessory: getZaiAccessory(account.usage, account.error, account.isLoading),
            revalidate: account.revalidate,
            isOpenCodeActive: account.isOpenCodeActive,
          }))
        : [],
    [isZaiVisible, zaiAccounts],
  );

  const visibleAgents = useMemo(
    () => [...singleAgents, ...codexAgents, ...kimiAgents, ...syntheticAgents, ...zaiAgents].filter((a) => a.visible),
    [singleAgents, codexAgents, kimiAgents, syntheticAgents, zaiAgents],
  );
  const isLoading = visibleAgents.some((agent) => agent.isLoading);

  // Auto-refresh when user clicks the menu bar icon (after initial load completes)
  const hasAutoRefreshed = useRef(false);
  useEffect(() => {
    if (
      environment.launchType === LaunchType.UserInitiated &&
      !hasAutoRefreshed.current &&
      !isLoading &&
      visibleAgents.length > 0
    ) {
      hasAutoRefreshed.current = true;
      void Promise.all(visibleAgents.map((a) => a.revalidate()));
    }
  }, [isLoading, visibleAgents]);

  const handleRefresh = async () => {
    await Promise.all(visibleAgents.map((a) => a.revalidate()));
    await showHUD("Agent Usage Refreshed");
  };

  return (
    <MenuBarExtra icon="extension-icon.png" isLoading={isLoading} tooltip="Agent Usage">
      <MenuBarExtra.Section>
        {visibleAgents.map((agent) => (
          <MenuBarExtra.Item
            key={agent.id}
            icon={agent.icon}
            title={getMenuItemTitle(agent.name, agent.accessory.text, agent.isOpenCodeActive)}
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
          title="Refresh All"
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
