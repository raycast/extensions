import { Color, getPreferenceValues, Icon, LaunchType, LocalStorage, MenuBarExtra, launchCommand } from "@raycast/api";
import { showFailureToast, useCachedState } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";

import { useChatSessions } from "./hooks/use-chat-sessions";
import { useUsage } from "./hooks/use-usage";
import { combinedProviderMenuBarIcon, liveIcon, providerIcon, providerMenuBarIcon } from "./lib/presentation";
import { shortcut, useShortcutStore } from "./lib/shortcuts";
import {
  currentUsageWindows,
  isUsageStateFresh,
  usageProviderName,
  type UsageProvider,
  usageCacheTtlMilliseconds,
  type ProviderUsageState,
  type UsageWindow,
} from "./lib/usage";
import { isShortTermWindow, selectMenuBarWindow, type MenuBarWindow } from "./lib/usage-selection";
import type { ChatProvider } from "./lib/types";

const providerOrder: ChatProvider[] = ["claude", "codex"];
const menuBarDisplayStorageKey = "usage-menu-bar-display-v1";
const menuBarPercentageStorageKey = "usage-menu-bar-percentage-v1";
const menuBarWindowStorageKey = "usage-menu-bar-window-v1";
const menuBarContentStorageKey = "usage-menu-bar-content-v1";
const maximumMenuChatItems = 4;
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
});

type MenuBarDisplay = "automatic" | "both" | UsageProvider;
type MenuBarPercentage = "remaining" | "used";
type MenuBarContent = "percentage" | "reset" | "percentage-reset";

export default function Command() {
  useShortcutStore();
  const [display, setDisplay] = useState<MenuBarDisplay>("automatic");
  const [percentage, setPercentage] = useState<MenuBarPercentage>("remaining");
  const [windowSelection, setWindowSelection] = useState<MenuBarWindow>("automatic");
  const [content, setContent] = useState<MenuBarContent>("percentage-reset");
  const { snapshot, isLoading, error, refresh } = useUsage({
    refreshIntervalMilliseconds: usageCacheTtlMilliseconds,
  });
  const { usageOnly } = getPreferenceValues<Preferences>();

  useEffect(() => {
    let active = true;
    void Promise.all([
      LocalStorage.getItem<string>(menuBarDisplayStorageKey),
      LocalStorage.getItem<string>(menuBarPercentageStorageKey),
      LocalStorage.getItem<string>(menuBarWindowStorageKey),
      LocalStorage.getItem<string>(menuBarContentStorageKey),
    ]).then(([storedDisplay, storedPercentage, storedWindow, storedContent]) => {
      if (!active) return;
      if (isMenuBarDisplay(storedDisplay)) setDisplay(storedDisplay);
      if (isMenuBarPercentage(storedPercentage)) setPercentage(storedPercentage);
      if (isMenuBarWindow(storedWindow)) setWindowSelection(storedWindow);
      if (isMenuBarContent(storedContent)) setContent(storedContent);
    });
    return () => {
      active = false;
    };
  }, []);

  const states = [
    ...providerOrder.map(
      (provider): ProviderUsageState =>
        snapshot?.providers[provider] || {
          provider,
          source: "unavailable",
          error: error?.message,
        },
    ),
    ...(snapshot?.customProviders || []),
  ];
  const combinedWindows = providerOrder.map((provider) => ({
    provider,
    ...selectMenuBarWindow(states, provider, windowSelection, Date.now(), usageOnly),
  }));
  const limitingWindow =
    display === "both"
      ? undefined
      : selectMenuBarWindow(
          states,
          display === "automatic" ? undefined : display,
          windowSelection,
          Date.now(),
          usageOnly,
        );
  const displayedProvider =
    display === "automatic" ? limitingWindow?.provider : display === "both" ? undefined : display;
  const reset = limitingWindow?.window.resetsAt ? formatCompactReset(limitingWindow.window.resetsAt) : undefined;
  const title =
    display === "both"
      ? combinedMenuBarTitle(combinedWindows, percentage, content)
      : limitingWindow
        ? menuBarTitle(limitingWindow.window, percentage, content, reset, limitingWindow.lastObserved)
        : "—";
  const tooltip =
    display === "both"
      ? combinedWindows
          .map(({ provider, window, lastObserved }) =>
            menuBarTooltip(provider, window, percentage, states, lastObserved),
          )
          .join("\n")
      : limitingWindow
        ? menuBarTooltip(
            limitingWindow.provider,
            limitingWindow.window,
            percentage,
            states,
            limitingWindow.lastObserved,
          )
        : "Usage unavailable";
  const latestUpdate = Math.max(...states.map((state) => state.data?.fetchedAt || 0));
  const selectDisplay = async (nextDisplay: MenuBarDisplay) => {
    setDisplay(nextDisplay);
    await LocalStorage.setItem(menuBarDisplayStorageKey, nextDisplay);
  };
  const selectPercentage = async (nextPercentage: MenuBarPercentage) => {
    setPercentage(nextPercentage);
    await LocalStorage.setItem(menuBarPercentageStorageKey, nextPercentage);
  };
  const selectWindow = async (nextWindow: MenuBarWindow) => {
    setWindowSelection(nextWindow);
    await LocalStorage.setItem(menuBarWindowStorageKey, nextWindow);
  };
  const selectContent = async (nextContent: MenuBarContent) => {
    setContent(nextContent);
    await LocalStorage.setItem(menuBarContentStorageKey, nextContent);
  };

  return (
    <MenuBarExtra
      icon={
        display === "both"
          ? combinedProviderMenuBarIcon()
          : displayedProvider
            ? usageMenuIcon(displayedProvider)
            : Icon.Calendar
      }
      title={title}
      tooltip={tooltip}
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title={"Menu Bar Display"}>
        <MenuBarExtra.Item
          title={"Automatic · Lowest Limit"}
          subtitle={display === "automatic" ? "Selected" : undefined}
          icon={Icon.Calendar}
          onAction={() => selectDisplay("automatic")}
        />
        <MenuBarExtra.Item
          title={"Show Claude and Codex"}
          subtitle={display === "both" ? "Selected" : undefined}
          icon={combinedProviderMenuBarIcon()}
          onAction={() => selectDisplay("both")}
        />
        {states.map((state) => (
          <MenuBarExtra.Item
            key={`${state.provider}-display`}
            title={`${"Show"} ${usageProviderName(state)}`}
            subtitle={
              display === state.provider
                ? "Selected"
                : providerSummaryTitle(state, percentage, usageOnly).replace(`${usageProviderName(state)} · `, "")
            }
            icon={usageMenuIcon(state.provider)}
            onAction={() => selectDisplay(state.provider)}
          />
        ))}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title={"Displayed Limit"}>
        <MenuBarExtra.Item
          title={"Automatic · Lowest Remaining"}
          subtitle={windowSelection === "automatic" ? "Selected" : undefined}
          icon={Icon.Gauge}
          onAction={() => selectWindow("automatic")}
        />
        <MenuBarExtra.Item
          title={"5-Hour or Short-Term Limit"}
          subtitle={windowSelection === "short-term" ? "Selected" : undefined}
          icon={Icon.Hourglass}
          onAction={() => selectWindow("short-term")}
        />
        <MenuBarExtra.Item
          title={"Weekly Limit"}
          subtitle={windowSelection === "weekly" ? "Selected" : undefined}
          icon={Icon.Calendar}
          onAction={() => selectWindow("weekly")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title={"Menu Bar Content"}>
        <MenuBarExtra.Item
          title={"Percentage and Reset"}
          subtitle={content === "percentage-reset" ? "Selected" : undefined}
          icon={Icon.Clock}
          onAction={() => selectContent("percentage-reset")}
        />
        <MenuBarExtra.Item
          title={"Percentage Only"}
          subtitle={content === "percentage" ? "Selected" : undefined}
          icon={Icon.CircleProgress75}
          onAction={() => selectContent("percentage")}
        />
        <MenuBarExtra.Item
          title={"Reset Time Only"}
          subtitle={content === "reset" ? "Selected" : undefined}
          icon={Icon.Clock}
          onAction={() => selectContent("reset")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title={"Percentage"}>
        <MenuBarExtra.Item
          title={"Show Remaining"}
          subtitle={percentage === "remaining" ? "Selected" : undefined}
          icon={Icon.CircleProgress75}
          onAction={() => selectPercentage("remaining")}
        />
        <MenuBarExtra.Item
          title={"Show Used"}
          subtitle={percentage === "used" ? "Selected" : undefined}
          icon={Icon.CircleProgress25}
          onAction={() => selectPercentage("used")}
        />
      </MenuBarExtra.Section>

      {!usageOnly ? <ChatMenuSection /> : null}

      <MenuBarExtra.Section title={"Overview"}>
        {states.map((state) => (
          <MenuBarExtra.Item
            key={state.provider}
            title={providerSummaryTitle(state, percentage, usageOnly)}
            subtitle={providerSummarySubtitle(state, usageOnly)}
            icon={usageMenuIcon(state.provider)}
            onAction={openUsageCommand}
          />
        ))}
      </MenuBarExtra.Section>

      {states.map((state) => (
        <MenuBarExtra.Section key={`${state.provider}-limits`} title={providerSectionTitle(state)}>
          {state.data?.windows.length ? (
            state.data.windows.map((window) => (
              <MenuBarExtra.Item
                key={window.id}
                title={`${isCurrentWindow(state, window) ? "" : "Last observed · "}${window.title} · ${formatPercent(windowPercent(window, percentage))} ${percentageLabel(percentage)}`}
                subtitle={
                  window.resetsAt
                    ? `${"Resets"} ${formatReset(window.resetsAt)} · ${formatPercent(windowPercent(window, oppositePercentage(percentage)))} ${percentageLabel(oppositePercentage(percentage))}`
                    : `${formatPercent(windowPercent(window, oppositePercentage(percentage)))} ${percentageLabel(oppositePercentage(percentage))}`
                }
                icon={{
                  source: isShortTermWindow(window) ? Icon.Hourglass : progressIcon(window.remainingPercent),
                  tintColor: isCurrentWindow(state, window) ? usageColor(window.remainingPercent) : Color.SecondaryText,
                }}
                onAction={openUsageCommand}
              />
            ))
          ) : (
            <MenuBarExtra.Item
              title={state.error ? "Usage Unavailable" : "No Limits"}
              subtitle={state.error || "No limits were returned for this account"}
              icon={state.error ? Icon.Warning : Icon.MinusCircle}
              onAction={openUsageCommand}
            />
          )}
          {!isUsageStateFresh(state) && state.data ? (
            <MenuBarExtra.Item
              title={
                selectMenuBarWindow([state], state.provider, "automatic", Date.now(), usageOnly)?.lastObserved
                  ? "Last Observed · Updates While Claude Is Active"
                  : "Historical Reading · Excluded From Menu Bar"
              }
              subtitle={state.error}
              icon={Icon.Warning}
              onAction={openUsageCommand}
            />
          ) : null}
        </MenuBarExtra.Section>
      ))}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={"Refresh Usage"}
          icon={Icon.ArrowClockwise}
          shortcut={shortcut("common.refresh")}
          onAction={() => refresh(true)}
        />
        <MenuBarExtra.Item title={"Open Usage Viewer"} icon={Icon.BarChart} onAction={openUsageCommand} />
        {latestUpdate > 0 ? (
          <MenuBarExtra.Item
            title={`${"Updated"} ${timeFormatter.format(latestUpdate)}`}
            subtitle={"Refreshes automatically every 5 minutes"}
            icon={states.some((state) => !isUsageStateFresh(state)) ? Icon.Warning : Icon.Clock}
            onAction={() => refresh(true)}
          />
        ) : null}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

async function openUsageCommand(): Promise<void> {
  try {
    await launchCommand({ name: "cli-usage", type: LaunchType.UserInitiated });
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Open Usage Viewer" });
  }
}

async function openPromptCastCommand(sessionKey?: string): Promise<void> {
  try {
    await launchCommand({
      name: "codex-claude-cli",
      type: LaunchType.UserInitiated,
      context: sessionKey ? { sessionKey } : undefined,
    });
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Open PromptCast" });
  }
}

function sessionKey(session: { provider: ChatProvider; id: string }): string {
  return `${session.provider}:${session.id}`;
}

function isMenuBarDisplay(value: string | undefined): value is MenuBarDisplay {
  return (
    value === "automatic" ||
    value === "both" ||
    value === "claude" ||
    value === "codex" ||
    Boolean(value?.startsWith("custom-"))
  );
}

function isMenuBarPercentage(value: string | undefined): value is MenuBarPercentage {
  return value === "remaining" || value === "used";
}

function isMenuBarWindow(value: string | undefined): value is MenuBarWindow {
  return value === "automatic" || value === "short-term" || value === "weekly";
}

function isMenuBarContent(value: string | undefined): value is MenuBarContent {
  return value === "percentage" || value === "reset" || value === "percentage-reset";
}

function menuBarTitle(
  window: UsageWindow,
  percentage: MenuBarPercentage,
  content: MenuBarContent,
  reset: string | undefined,
  lastObserved = false,
): string {
  const percentageText = `${lastObserved ? "~" : ""}${formatPercent(windowPercent(window, percentage))}`;
  const resetText = reset;
  if (content === "percentage") return percentageText;
  if (content === "reset") return resetText ? `${lastObserved ? "~" : ""}${resetText}` : percentageText;
  return [percentageText, resetText].filter(Boolean).join(" ");
}

function combinedMenuBarTitle(
  selections: { provider: UsageProvider; window?: UsageWindow; lastObserved?: boolean }[],
  percentage: MenuBarPercentage,
  content: MenuBarContent,
): string {
  return selections
    .map(({ window, lastObserved }) => {
      const reset = window?.resetsAt ? formatCompactReset(window.resetsAt) : undefined;
      return window ? menuBarTitle(window, percentage, content, reset, lastObserved) : "—";
    })
    .join("   ");
}

function menuBarTooltip(
  provider: UsageProvider,
  window: UsageWindow | undefined,
  percentage: MenuBarPercentage,
  states: ProviderUsageState[],
  lastObserved = false,
): string {
  const name = usageProviderName(
    states.find((state) => state.provider === provider) || { provider, source: "unavailable" },
  );
  if (!window) return `${name} · ${"Usage unavailable"}`;
  const reset = window.resetsAt ? formatCompactReset(window.resetsAt) : undefined;
  return `${name}${lastObserved ? " · Last observed" : ""} · ${window.title} · ${formatPercent(windowPercent(window, percentage))} ${percentageLabel(percentage)}${reset ? ` · ${"resets in"} ${reset}` : ""}`;
}

function providerSummaryTitle(state: ProviderUsageState, percentage: MenuBarPercentage, usageOnly: boolean): string {
  const selection = selectMenuBarWindow([state], state.provider, "automatic", Date.now(), usageOnly);
  const remaining = selection?.window.remainingPercent;
  const value = remaining === undefined ? undefined : percentage === "remaining" ? remaining : 100 - remaining;
  return `${usageProviderName(state)} · ${value === undefined ? "—" : `${selection?.lastObserved ? "~" : ""}${formatPercent(value)} ${percentageLabel(percentage)}`}`;
}

function providerSummarySubtitle(state: ProviderUsageState, usageOnly: boolean): string | undefined {
  const parts: string[] = [];
  if (state.data?.plan) parts.push(planTitle(state.data.plan));
  parts.push(
    selectMenuBarWindow([state], state.provider, "automatic", Date.now(), usageOnly)?.lastObserved
      ? "Last observed"
      : sourceLabel(state),
  );
  if (!state.data && state.error) parts.push(state.error);
  return parts.filter(Boolean).join(" · ") || undefined;
}

function providerSectionTitle(state: ProviderUsageState): string {
  const plan = state.data?.plan ? ` · ${planTitle(state.data.plan)}` : "";
  return `${usageProviderName(state)}${plan}`;
}

function sourceLabel(state: ProviderUsageState): string {
  if (state.data && !isUsageStateFresh(state)) return "Historical · Not Counted";
  if (state.error) return "Unavailable";
  if (state.bridgeConnected && !state.data) return "Waiting for Claude Code";
  if (state.source === "live") return "Live";
  if (state.source === "cache") return "Recent Cache";
  if (state.source === "stale") return "Cached · Refresh Failed";
  return "Unavailable";
}

function planTitle(plan: string): string {
  const normalized = plan.toLowerCase();
  const knownPlans: Record<string, string> = {
    free: "Free",
    plus: "Plus",
    pro: "Pro",
    max: "Max",
    team: "Team",
    business: "Business",
    enterprise: "Enterprise",
  };
  return knownPlans[normalized] || plan.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatPercent(value: number): string {
  return `${Math.round(Math.max(0, Math.min(100, value)))}%`;
}

function windowPercent(window: UsageWindow, percentage: MenuBarPercentage): number {
  return percentage === "remaining" ? window.remainingPercent : window.usedPercent;
}

function oppositePercentage(percentage: MenuBarPercentage): MenuBarPercentage {
  return percentage === "remaining" ? "used" : "remaining";
}

function percentageLabel(percentage: MenuBarPercentage): string {
  return percentage === "remaining" ? "remaining" : "used";
}

function formatCompactReset(timestamp: number): string | undefined {
  const elapsedMinutes = Math.ceil((timestamp - Date.now()) / 60_000);
  if (elapsedMinutes <= 0) return undefined;
  if (elapsedMinutes < 60) return `${elapsedMinutes}m`;
  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;
  if (hours < 24) return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours ? `${days}d ${remainingHours}h` : `${days}d`;
}

function formatReset(timestamp: number): string {
  const elapsedMinutes = Math.ceil((timestamp - Date.now()) / 60_000);
  if (elapsedMinutes <= 0) return "now";
  if (elapsedMinutes < 60) return `${"in"} ${elapsedMinutes} min`;
  if (elapsedMinutes < 1_440) {
    const hours = Math.floor(elapsedMinutes / 60);
    const minutes = elapsedMinutes % 60;
    return minutes ? `${"in"} ${hours} h ${minutes} min` : `${"in"} ${hours} h`;
  }
  const days = Math.floor(elapsedMinutes / 1_440);
  const hours = Math.floor((elapsedMinutes % 1_440) / 60);
  return hours ? `${"in"} ${days} d ${hours} h` : `${"in"} ${days} d`;
}

function progressIcon(remainingPercent: number): Icon {
  if (remainingPercent >= 88) return Icon.CircleProgress100;
  if (remainingPercent >= 63) return Icon.CircleProgress75;
  if (remainingPercent >= 38) return Icon.CircleProgress50;
  if (remainingPercent >= 13) return Icon.CircleProgress25;
  return Icon.Circle;
}

function usageColor(remainingPercent: number): Color {
  if (remainingPercent <= 15) return Color.Red;
  if (remainingPercent <= 35) return Color.Yellow;
  return Color.Green;
}

function usageMenuIcon(provider: UsageProvider) {
  return provider === "claude" || provider === "codex" ? providerMenuBarIcon(provider) : Icon.Gauge;
}

function isCurrentWindow(state: ProviderUsageState, window: UsageWindow): boolean {
  return currentUsageWindows(state).includes(window);
}

function ChatMenuSection() {
  const { sessions: discoveredSessions } = useChatSessions({ notifyOnError: false });
  const [favoriteChatKeys] = useCachedState<string[]>("favorite-chat-keys", []);
  const [sessionTitleOverrides] = useCachedState<Record<string, string>>("session-title-overrides", {});
  const sessions = useMemo(
    () =>
      discoveredSessions.map((session) => ({
        ...session,
        title: sessionTitleOverrides[sessionKey(session)] || session.title,
      })),
    [discoveredSessions, sessionTitleOverrides],
  );
  const favoriteChats = useMemo(() => new Set(favoriteChatKeys), [favoriteChatKeys]);
  const favoriteSessionCandidates = useMemo(
    () => sessions.filter((session) => favoriteChats.has(sessionKey(session))),
    [favoriteChats, sessions],
  );
  const liveSessionCandidates = useMemo(
    () => sessions.filter((session) => session.isActive && !favoriteChats.has(sessionKey(session))),
    [favoriteChats, sessions],
  );
  const favoriteSessions = favoriteSessionCandidates.slice(0, maximumMenuChatItems);
  const liveSessions = liveSessionCandidates.slice(0, maximumMenuChatItems);

  return favoriteSessions.length > 0 || liveSessions.length > 0 ? (
    <MenuBarExtra.Section title={"Chats"}>
      {favoriteSessions.length > 0 ? (
        <MenuBarExtra.Submenu title={`${"Favorite Chats"} · ${favoriteSessionCandidates.length}`} icon={Icon.Star}>
          {favoriteSessions.map((session) => (
            <MenuBarExtra.Item
              key={`favorite-${sessionKey(session)}`}
              title={session.title}
              subtitle={session.projectName}
              icon={providerIcon(session.provider)}
              onAction={() => openPromptCastCommand(sessionKey(session))}
            />
          ))}
          {favoriteSessionCandidates.length > favoriteSessions.length ? (
            <MenuBarExtra.Item
              title={"Open All Favorite Chats"}
              icon={Icon.List}
              onAction={() => openPromptCastCommand()}
            />
          ) : null}
        </MenuBarExtra.Submenu>
      ) : null}
      {liveSessions.length > 0 ? (
        <MenuBarExtra.Submenu title={`${"Live Chats"} · ${liveSessionCandidates.length}`} icon={liveIcon}>
          {liveSessions.map((session) => (
            <MenuBarExtra.Item
              key={`live-${sessionKey(session)}`}
              title={session.title}
              subtitle={session.projectName}
              icon={providerIcon(session.provider)}
              onAction={() => openPromptCastCommand(sessionKey(session))}
            />
          ))}
          {liveSessionCandidates.length > liveSessions.length ? (
            <MenuBarExtra.Item
              title={"Open All Live Chats"}
              icon={Icon.List}
              onAction={() => openPromptCastCommand()}
            />
          ) : null}
        </MenuBarExtra.Submenu>
      ) : null}
    </MenuBarExtra.Section>
  ) : null;
}
