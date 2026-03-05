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
import { useEffect, useRef } from "react";
import type { AgentId, Accessory } from "./agents/types";
import { useAmpUsage } from "./amp/fetcher";
import { getAmpAccessory } from "./amp/renderer";
import { useAntigravityUsage } from "./antigravity/fetcher";
import { getAntigravityAccessory } from "./antigravity/renderer";
import { useCodexUsage } from "./codex/fetcher";
import { getCodexAccessory } from "./codex/renderer";
import { useDroidUsage } from "./droid/fetcher";
import { getDroidAccessory } from "./droid/renderer";
import { useGeminiUsage } from "./gemini/fetcher";
import { getGeminiAccessory } from "./gemini/renderer";
import { useKimiUsage } from "./kimi/fetcher";
import { getKimiAccessory } from "./kimi/renderer";
import { useZaiUsage } from "./zai/fetcher";
import { getZaiAccessory } from "./zai/renderer";

interface MenuBarAgent {
  id: AgentId;
  name: string;
  icon: string;
  visible: boolean;
  isLoading: boolean;
  accessory: Accessory;
  revalidate: () => Promise<void>;
}

type Preferences = Preferences.AgentUsageMenubar;

function getMenuItemTitle(name: string, value: string): string {
  return value ? `${name}  ${value}` : name;
}

function getMenuItemTooltip(usageTooltip?: string): string {
  const actionHint = "Click to open details";
  return usageTooltip ? `${usageTooltip}\n${actionHint}` : actionHint;
}

export default function MenuBarCommand() {
  const prefs = getPreferenceValues<Preferences>();
  const isAmpVisible = Boolean(prefs.showAmp);
  const isCodexVisible = Boolean(prefs.showCodex);
  const isDroidVisible = Boolean(prefs.showDroid);
  const isGeminiVisible = Boolean(prefs.showGemini);
  const isKimiVisible = Boolean(prefs.showKimi);
  const isAntigravityVisible = Boolean(prefs.showAntigravity);
  const isZaiVisible = Boolean(prefs.showZai);

  const ampState = useAmpUsage(isAmpVisible);
  const codexState = useCodexUsage(isCodexVisible);
  const droidState = useDroidUsage(isDroidVisible);
  const geminiState = useGeminiUsage(isGeminiVisible);
  const kimiState = useKimiUsage(isKimiVisible);
  const antigravityState = useAntigravityUsage(isAntigravityVisible);
  const zaiState = useZaiUsage(isZaiVisible);

  const allAgents: MenuBarAgent[] = [
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
      id: "codex",
      name: "Codex",
      icon: "codex-icon.svg",
      visible: isCodexVisible,
      isLoading: codexState.isLoading,
      accessory: getCodexAccessory(codexState.usage, codexState.error, codexState.isLoading),
      revalidate: codexState.revalidate,
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
      id: "kimi",
      name: "Kimi",
      icon: "kimi-icon.ico",
      visible: isKimiVisible,
      isLoading: kimiState.isLoading,
      accessory: getKimiAccessory(kimiState.usage, kimiState.error, kimiState.isLoading),
      revalidate: kimiState.revalidate,
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
    {
      id: "zai",
      name: "z.ai",
      icon: "zhipu-icon.svg",
      visible: isZaiVisible,
      isLoading: zaiState.isLoading,
      accessory: getZaiAccessory(zaiState.usage, zaiState.error, zaiState.isLoading),
      revalidate: zaiState.revalidate,
    },
  ];

  const visibleAgents = allAgents.filter((a) => a.visible);
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
  }, [isLoading]);

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
            title={getMenuItemTitle(agent.name, agent.accessory.text)}
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
