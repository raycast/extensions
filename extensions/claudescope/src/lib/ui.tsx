import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  open,
  openExtensionPreferences,
  showHUD,
  showToast,
} from "@raycast/api";
import { ClaudeScopeError, openClaudeScope } from "./claudescope";

const QUICK_START_URL = "https://github.com/vladar107/claudescope#quick-start";

interface AgentPresentation {
  label: string;
  color: Color.Dynamic;
}

/** Keep Raycast's agent tags aligned with ClaudeScope's light/dark badge palette. */
const AGENT_PRESENTATIONS: Record<string, AgentPresentation> = {
  "claude-code": { label: "Claude", color: { light: "#BF4722", dark: "#E8896B", adjustContrast: false } },
  codex: { label: "Codex", color: { light: "#0A7A5E", dark: "#2CC4A0", adjustContrast: false } },
  junie: { label: "Junie", color: { light: "#1A7F37", dark: "#56D964", adjustContrast: false } },
  pi: { label: "pi", color: { light: "#6E40C9", dark: "#A371F7", adjustContrast: false } },
  opencode: { label: "opencode", color: { light: "#9E6A03", dark: "#E3B341", adjustContrast: false } },
  copilot: { label: "Copilot", color: { light: "#0969DA", dark: "#58A6FF", adjustContrast: false } },
  antigravity: { label: "Antigravity", color: { light: "#1A73E8", dark: "#8AB4F8", adjustContrast: false } },
  grok: { label: "Grok", color: { light: "#40484F", dark: "#C4CDD6", adjustContrast: false } },
};

export function agentTag(connectorId: string): { value: string; color?: Color.ColorLike } {
  const presentation = AGENT_PRESENTATIONS[connectorId];
  return presentation
    ? { value: presentation.label, color: presentation.color }
    : { value: connectorId, color: Color.SecondaryText };
}

export function ErrorView({ error, retry }: { error: Error; retry: () => void }) {
  const claudeScopeError = error instanceof ClaudeScopeError ? error : undefined;
  const detail = claudeScopeError?.detail ?? error.message;
  return (
    <List.EmptyView
      icon={Icon.Warning}
      title={claudeScopeError?.message ?? "ClaudeScope Request Failed"}
      description={detail}
      actions={
        <ActionPanel>
          <Action title="Retry" icon={Icon.ArrowClockwise} onAction={retry} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          {claudeScopeError?.kind === "incompatible" ? (
            <Action.CopyToClipboard title="Copy Update Command" content="claudescope update" />
          ) : claudeScopeError?.kind === "missing" ? (
            <Action.OpenInBrowser title="Open ClaudeScope Quick Start" url={QUICK_START_URL} />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

export async function openWithFeedback(sessionId?: string, messageUuid?: string): Promise<void> {
  try {
    await openClaudeScope(sessionId, messageUuid);
    await showHUD(sessionId ? "Opened session in ClaudeScope" : "Opened ClaudeScope");
  } catch (error) {
    const claudeScopeError = error instanceof ClaudeScopeError ? error : undefined;
    await showToast({
      style: Toast.Style.Failure,
      title: claudeScopeError?.message ?? "Could Not Open ClaudeScope",
      message: claudeScopeError?.detail ?? (error instanceof Error ? error.message : String(error)),
      primaryAction:
        claudeScopeError?.kind === "missing"
          ? { title: "Open Quick Start", onAction: () => open(QUICK_START_URL) }
          : { title: "Open Preferences", onAction: openExtensionPreferences },
    });
  }
}

export function formatTokens(tokens: number): string {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(tokens);
}

export function formatCost(cost: number): string {
  return cost === 0 ? "$0" : `$${cost.toFixed(cost < 0.01 ? 4 : 2)}`;
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function clip(value: string, length = 180): string {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > length ? `${compact.slice(0, length - 1)}…` : compact;
}
