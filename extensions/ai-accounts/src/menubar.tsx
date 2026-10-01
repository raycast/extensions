import { Color, Icon, Image, Keyboard, launchCommand, LaunchProps, LaunchType, MenuBarExtra } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { useEffect, useState } from "react";
import { displayLabels, PROVIDER_NAMES, refreshStale, sourceName } from "./lib/flow";
import {
  DISPLAY_MAX_AGE_MINUTES,
  formatAge,
  formatCountdown,
  formatPct,
  remainingPct,
  windowAgeMinutes,
  windowPastReset,
} from "./lib/format";
import { CODEXBAR_TIMEOUT_MS } from "./lib/claude";
import { Account, Provider, PROVIDERS, Snapshot, Suggestion, UsageWindow } from "./lib/model";
import { Config } from "./lib/prefs";
import { readSnapshot, readSuggestionState, writeSuggestionState } from "./lib/store";
import { isSwitchBlockedInfo, suggest } from "./lib/suggest";
import {
  currentRemaining,
  displayHeadroom,
  menuSegment,
  sessionWindow,
  shownText,
  switchableSuggestions,
  windowName,
  windowsSummary,
} from "./lib/display";
import {
  buildDeps,
  getConfig,
  levelColor,
  openCodexBar,
  readDismissedRows,
  requestSwitch,
  stateDir,
} from "./raycast/runtime";

// Menu-bar command: renders the cached snapshot immediately, refreshes providers older than 2 min
// while isLoading is true, then unloads. onAction handlers only launch other commands, because
// Raycast can unload this command before any other async work finishes.

const MENU_MAX_AGE_MS = 120_000;
/**
 * isLoading always ends, even if a backend hangs past its own timeout. It must outlast the slowest fetch path, the
 * Claude ambient fallback (two CodexBar reads of up to 45 s each), or the command unloads mid-refresh and its
 * result is lost (the provider lock then frees once its heartbeat lease runs out).
 */
const SAFETY_MS = 2 * CODEXBAR_TIMEOUT_MS + 20_000;

interface MenuValue {
  value: number | null;
  window: UsageWindow | null;
}

/** The number shown for an account: display headroom, or weekly remaining when preferred. */
function menuValue(account: Account, cfg: Config, nowMs: number): MenuValue {
  if (cfg.menuBarValue === "weekly") {
    const w = account.windows.find((x) => x.kind === "weekly");
    if (!w || account.status !== "ok" || account.lastGood || windowPastReset(w, nowMs)) {
      return { value: null, window: w ?? null };
    }
    const age = windowAgeMinutes(w, nowMs);
    const fresh = age !== null && age <= DISPLAY_MAX_AGE_MINUTES;
    return { value: fresh ? remainingPct(w) : null, window: w };
  }
  const hr = displayHeadroom(account, cfg.suggestion, nowMs);
  return { value: hr.value, window: hr.binding };
}

function hasData(snapshot: Snapshot, provider: Provider): boolean {
  const s = snapshot.providers[provider];
  return s.accounts.length > 0 || s.committedAt !== null || s.lastError !== null;
}

function activeAccount(snapshot: Snapshot, provider: Provider): Account | null {
  const actives = snapshot.providers[provider].accounts.filter((a) => a.active === true);
  return actives.length === 1 ? actives[0] : null;
}

function newestObservation(account: Account): string | null {
  let best: string | null = null;
  let bestMs = -Infinity;
  for (const w of account.windows) {
    const ms = w.observedAt ? Date.parse(w.observedAt) : NaN;
    if (Number.isFinite(ms) && ms > bestMs) {
      bestMs = ms;
      best = w.observedAt;
    }
  }
  return best;
}

function resetSubtitle(w: UsageWindow | null | undefined, nowMs: number): string | undefined {
  if (!w?.resetsAt) return undefined;
  const c = formatCountdown(w.resetsAt, nowMs);
  if (c === "—") return undefined;
  return `${windowName(w)} ${c === "now" ? "reset due" : `resets in ${c}`}`;
}

function windowsTooltip(account: Account, cfg: Config, nowMs: number): string {
  const modeWord = cfg.percentMode === "used" ? "used" : "left";
  return account.windows
    .map((w) => {
      const value = windowPastReset(w, nowMs)
        ? `${windowName(w)} awaiting refresh`
        : `${windowName(w)} ${shownText(currentRemaining(account, w, nowMs, DISPLAY_MAX_AGE_MINUTES), cfg.percentMode)} ${modeWord}`;
      return [value, resetSubtitle(w, nowMs)].filter(Boolean).join(" · ");
    })
    .join("\n");
}

const STATUS_SUBTITLE: Record<Account["status"], string | null> = {
  ok: null,
  error: "error",
  relogin: "needs re-login",
  unavailable: "no data",
  disabled: "disabled",
};

export default function Command(props: LaunchProps<{ launchContext?: { force?: boolean } }>) {
  const cfg = getConfig();
  const dir = stateDir();
  const [snapshot, setSnapshot] = useState<Snapshot>(() => readSnapshot(dir));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let finished = false;
    const finish = async () => {
      if (finished) return;
      finished = true;
      const snap = readSnapshot(dir);
      try {
        // Persist suggestion hysteresis before unloading (render-time results are never cached).
        const { nextState } = suggest(snap, cfg.suggestion, Date.now(), readSuggestionState(dir));
        await writeSuggestionState(dir, nextState);
      } catch {
        // bookkeeping only
      }
      setSnapshot(snap);
      setIsLoading(false);
    };
    const safety = setTimeout(() => void finish(), SAFETY_MS);
    refreshStale(buildDeps(cfg), { maxAgeMs: MENU_MAX_AGE_MS, force: props.launchContext?.force === true })
      .catch(() => undefined)
      .finally(() => {
        clearTimeout(safety);
        void finish();
      });
  }, []);

  const nowMs = Date.now();
  const dismissed = readDismissedRows();
  const { suggestions } = suggest(snapshot, cfg.suggestion, nowMs, readSuggestionState(dir));
  const targetOf = (s: Suggestion): Account | undefined =>
    s.targetKey ? snapshot.providers[s.provider].accounts.find((a) => a.key === s.targetKey) : undefined;
  const actionable = suggestions.filter((s) => s.targetKey);
  const info = suggestions.filter((s) => !s.targetKey);
  // '⇄' promises a one-click switch: only for suggestions whose target is present and not blocked.
  const switchable = switchableSuggestions(suggestions, snapshot);

  const titleParts: string[] = [];
  const tooltipLines: string[] = [];
  for (const provider of PROVIDERS) {
    if (!hasData(snapshot, provider)) continue;
    const letter = provider === "claude" ? "C" : "X";
    const active = activeAccount(snapshot, provider);
    const state = snapshot.providers[provider];
    if (!active) {
      titleParts.push(`${letter} ?`);
      tooltipLines.push(
        `${PROVIDER_NAMES[provider]}: current login unknown · updated ${formatAge(state.committedAt, nowMs)}`,
      );
      continue;
    }
    titleParts.push(
      `${letter} ${menuSegment(
        active,
        {
          value: cfg.menuBarValue,
          percentMode: cfg.percentMode,
          prefs: cfg.suggestion,
          maxAgeMinutes: DISPLAY_MAX_AGE_MINUTES,
        },
        nowMs,
      )}`,
    );
    const observed = newestObservation(active) ?? state.committedAt;
    tooltipLines.push(`${PROVIDER_NAMES[provider]}: ${active.label} · observed ${formatAge(observed, nowMs)}`);
    const windowDetails = windowsTooltip(active, cfg, nowMs);
    if (windowDetails) tooltipLines.push(windowDetails);
  }
  if (switchable.length > 0) tooltipLines.push(`Suggestion: ${switchable[0].title}`);
  const title = (titleParts.length > 0 ? titleParts.join(" · ") : "AI") + (switchable.length > 0 ? " ⇄" : "");

  const labels: Record<Provider, Map<string, string>> = {
    claude: displayLabels(snapshot.providers.claude.accounts),
    codex: displayLabels(snapshot.providers.codex.accounts),
  };

  function launchSwitch(account: Account, via: "menubar" | "suggestion"): void {
    const label = labels[account.provider].get(account.key) ?? account.label;
    requestSwitch(account, via, label).catch(() => undefined);
  }

  function openAccounts(): void {
    launchCommand({ name: "accounts", type: LaunchType.UserInitiated }).catch(() => undefined);
  }

  /** The sign-in tab and its progress run in the list, which stays loaded until the new account appears. */
  function addClaudeAccount(): void {
    launchCommand({ name: "accounts", type: LaunchType.UserInitiated, context: { action: "add-claude" } }).catch(
      () => undefined,
    );
  }

  /** Where a blocked switch is made instead: CodexBar for Codex; the list (which explains the reason) for Claude. */
  function handOff(provider: Provider): () => void {
    return provider === "codex" ? () => void openCodexBar().catch(() => undefined) : openAccounts;
  }

  function suggestionItem(s: Suggestion) {
    const target = targetOf(s);
    let onAction: (() => void) | undefined;
    if (target) onAction = target.switchBlocked ? handOff(s.provider) : () => launchSwitch(target, "suggestion");
    else if (isSwitchBlockedInfo(s)) onAction = handOff(s.provider);
    return (
      <MenuBarExtra.Item
        key={`suggestion:${s.id}`}
        icon={s.kind === "info" ? Icon.Info : Icon.Switch}
        title={s.title}
        subtitle={s.waitHint}
        tooltip={s.detail}
        onAction={onAction}
      />
    );
  }

  // Raycast can misroute actions between identical sibling items, so titles stay unique across providers too.
  const usedTitles = new Set<string>();

  function accountItem(account: Account) {
    const label = labels[account.provider].get(account.key) ?? account.label;
    const mv = menuValue(account, cfg, nowMs);
    const summary = windowsSummary(
      account,
      {
        percentMode: cfg.percentMode,
        maxAgeMinutes: DISPLAY_MAX_AGE_MINUTES,
      },
      nowMs,
    );
    let itemTitle = summary ? `${label}  ${summary}` : `${label}  ${formatPct(mv.value)}`;
    if (usedTitles.has(itemTitle)) itemTitle = `${itemTitle} · ${PROVIDER_NAMES[account.provider]}`;
    usedTitles.add(itemTitle);
    const color = levelColor(mv.value, cfg.suggestion.threshold);
    const icon: Image.ImageLike = account.needsAdd
      ? { source: Icon.PlusCircle, tintColor: Color.Orange }
      : account.active === true
        ? { source: Icon.CheckCircle, tintColor: color }
        : getProgressIcon(mv.value === null ? 0 : mv.value / 100, color);
    const status = account.needsAdd ? "in the Claude app · click to add" : STATUS_SUBTITLE[account.status];
    // The 5h window resets soonest and matters most minute to minute, so its countdown wins when present.
    const session = sessionWindow(account);
    const subtitle = status ?? resetSubtitle(session, nowMs) ?? resetSubtitle(mv.window, nowMs);
    const blocked = account.active !== true && account.switchBlocked ? account.switchBlocked : null;
    const tooltip = [windowsTooltip(account, cfg, nowMs), blocked].filter(Boolean).join("\n");
    let onAction: (() => void) | undefined;
    if (account.needsAdd) {
      onAction = addClaudeAccount;
    } else if (account.active === true) {
      onAction = openAccounts;
    } else if (blocked) {
      // Known to be refused: no switch launch, no provider lock; open where the switch can be made.
      onAction = handOff(account.provider);
    } else if (account.provider === "codex") {
      if (cfg.codexSwitchMode === "codexbar" || account.switchTarget?.kind === "codex-managed") {
        onAction = () => launchSwitch(account, "menubar");
      } else {
        onAction = () => void openCodexBar().catch(() => undefined);
      }
    } else if (account.switchTarget?.kind === "cswap") {
      onAction = () => launchSwitch(account, "menubar");
    } else {
      onAction = openAccounts;
    }
    return (
      <MenuBarExtra.Item
        key={account.key}
        icon={icon}
        title={account.needsAdd ? label : itemTitle}
        subtitle={account.inClaudeApp && !account.needsAdd && subtitle ? `${subtitle} · Claude app` : subtitle}
        tooltip={tooltip || undefined}
        onAction={onAction}
      />
    );
  }

  return (
    <MenuBarExtra title={title} tooltip={tooltipLines.join("\n") || undefined} isLoading={isLoading}>
      {suggestions.length > 0 ? (
        <MenuBarExtra.Section title="Suggestions">
          {actionable.map(suggestionItem)}
          {info.map(suggestionItem)}
        </MenuBarExtra.Section>
      ) : null}
      {PROVIDERS.map((provider) => {
        const state = snapshot.providers[provider];
        const source = sourceName(state.source);
        return (
          <MenuBarExtra.Section
            key={provider}
            title={source ? `${PROVIDER_NAMES[provider]} · ${source}` : PROVIDER_NAMES[provider]}
          >
            {state.lastError ? (
              <MenuBarExtra.Item
                key={`${provider}:error`}
                icon={{ source: Icon.Warning, tintColor: Color.Red }}
                title={`${PROVIDER_NAMES[provider]} refresh failed`}
                tooltip={state.lastError}
                onAction={openAccounts}
              />
            ) : null}
            {state.accounts.length === 0 && !state.lastError ? (
              <MenuBarExtra.Item
                key={`${provider}:empty`}
                title={`${PROVIDER_NAMES[provider]}: ${state.committedAt === null ? "loading…" : "no accounts"}`}
              />
            ) : null}
            {state.accounts.filter((a) => !(a.needsAdd && dismissed.includes(a.key))).map(accountItem)}
            {provider === "claude" && state.source === "cswap" ? (
              <MenuBarExtra.Item
                key="claude:add-account"
                icon={Icon.PlusCircle}
                title="Add Claude Account…"
                onAction={addClaudeAccount}
              />
            ) : null}
          </MenuBarExtra.Section>
        );
      })}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open AI Accounts" icon={Icon.List} onAction={openAccounts} />
        <MenuBarExtra.Item
          title="Refresh Now"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => {
            launchCommand({ name: "menubar", type: LaunchType.Background, context: { force: true } }).catch(
              () => undefined,
            );
          }}
        />
        <MenuBarExtra.Item
          title="Open CodexBar"
          icon={Icon.AppWindow}
          onAction={() => void openCodexBar().catch(() => undefined)}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
