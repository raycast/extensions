import { ActionPanel, Icon, List } from "@raycast/api";
import { Fragment, type ReactElement } from "react";

import type { ErrorPresentation, ErrorRecoveryAction } from "../application/errorPresentation";
import { ConnectionActions, type ConnectionActionHandler, type ConnectionActionsProps } from "./ConnectionActions";
import type { TaskListHealth } from "./taskListModel";

export type TaskHealthNoticeIcon = "clock" | "warning" | "important" | "error";
export type TaskHealthNoticeKind = "warning" | "stale" | "partial" | "stale-partial" | "read-error";

export type TaskHealthNotice = Readonly<{
  id: "ticktick-data-health-warning" | "ticktick-retained-read-error";
  kind: TaskHealthNoticeKind;
  title: string;
  description: string;
  icon: TaskHealthNoticeIcon;
  presentation: ErrorPresentation;
}>;

export type StaleDataWarningProps = Readonly<{
  health: TaskListHealth;
  hasResults: boolean;
  onReconnect?: ConnectionActionHandler;
  onOpenPreferences?: ConnectionActionHandler;
  onRefresh?: ConnectionActionHandler;
  onRetry?: ConnectionActionHandler;
}>;

const reconnectAction = Object.freeze({ kind: "reconnect", title: "Reconnect" } as const);
const openPreferencesAction = Object.freeze({ kind: "open-preferences", title: "Open Preferences" } as const);
const refreshAction = Object.freeze({ kind: "refresh", title: "Refresh" } as const);
const retryAction = Object.freeze({ kind: "retry", title: "Retry", mode: "manual" } as const);
const noActions = Object.freeze([] as const);
const authenticationActions = Object.freeze([reconnectAction, openPreferencesAction] as const);
const preferencesActions = Object.freeze([openPreferencesAction] as const);
const refreshActions = Object.freeze([refreshAction] as const);
const retryActions = Object.freeze([retryAction] as const);

const contextRefreshPresentation = Object.freeze({
  kind: "partial-refresh",
  title: "Refresh TickTick Data",
  message: "Refresh to request current TickTick data.",
  severity: "warning",
  retainData: true,
  actions: refreshActions,
}) satisfies ErrorPresentation;

const authenticationReadPresentation = Object.freeze({
  kind: "authentication",
  title: "Reconnect TickTick",
  message: "Your TickTick connection is no longer valid. Reconnect or update authentication in preferences.",
  severity: "error",
  retainData: true,
  actions: authenticationActions,
}) satisfies ErrorPresentation;

const permissionReadPresentation = Object.freeze({
  kind: "permission",
  title: "Permission Required",
  message: "TickTick did not grant permission for this action. Check authentication settings in preferences.",
  severity: "error",
  retainData: true,
  actions: preferencesActions,
}) satisfies ErrorPresentation;

const rateLimitReadPresentation = Object.freeze({
  kind: "rate-limit",
  title: "TickTick Is Temporarily Busy",
  message: "TickTick is limiting requests. Retry manually when ready.",
  severity: "warning",
  retainData: true,
  actions: retryActions,
}) satisfies ErrorPresentation;

const networkReadPresentation = Object.freeze({
  kind: "network",
  title: "TickTick Is Unreachable",
  message: "Couldn't reach TickTick. Available tasks may be out of date.",
  severity: "error",
  retainData: true,
  actions: refreshActions,
}) satisfies ErrorPresentation;

const partialRefreshReadPresentation = Object.freeze({
  kind: "partial-refresh",
  title: "Some Tasks Couldn't Be Refreshed",
  message: "Available tasks are shown, but some TickTick data could not be refreshed.",
  severity: "warning",
  retainData: true,
  actions: refreshActions,
}) satisfies ErrorPresentation;

const protocolReadPresentation = Object.freeze({
  kind: "protocol",
  title: "Unsupported TickTick Response",
  message: "TickTick returned data this extension could not safely process.",
  severity: "error",
  retainData: true,
  actions: refreshActions,
}) satisfies ErrorPresentation;

const validationReadPresentation = Object.freeze({
  kind: "validation",
  title: "Invalid Task Details",
  message: "Review the task details and try again.",
  severity: "error",
  retainData: true,
  actions: noActions,
}) satisfies ErrorPresentation;

const unknownReadPresentation = Object.freeze({
  kind: "unknown",
  title: "Something Went Wrong",
  message: "TickTick couldn't complete the request.",
  severity: "error",
  retainData: true,
  actions: noActions,
}) satisfies ErrorPresentation;

function readProperty(source: unknown, key: string): unknown {
  if (typeof source !== "object" || source === null) return undefined;
  try {
    return (source as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
}

function printableSingleLine(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;

  for (let index = 0; index < trimmed.length; index += 1) {
    const codeUnit = trimmed.charCodeAt(index);
    if (codeUnit <= 0x1f || (codeUnit >= 0x7f && codeUnit <= 0x9f)) return undefined;

    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = trimmed.charCodeAt(index + 1);
      if (!(nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff)) return undefined;
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return undefined;
    }
  }

  return Array.from(trimmed).some((character) => /\p{C}/u.test(character)) ? undefined : trimmed;
}

function snapshotRecoveryAction(source: unknown): ErrorRecoveryAction | undefined {
  const kindSnapshot = readProperty(source, "kind");
  const titleSnapshot = readProperty(source, "title");
  const modeSnapshot = readProperty(source, "mode");

  switch (kindSnapshot) {
    case "reconnect":
      return titleSnapshot === "Reconnect" ? Object.freeze({ kind: "reconnect", title: "Reconnect" }) : undefined;
    case "open-preferences":
      return titleSnapshot === "Open Preferences"
        ? Object.freeze({ kind: "open-preferences", title: "Open Preferences" })
        : undefined;
    case "refresh":
      return titleSnapshot === "Refresh" ? refreshAction : undefined;
    case "retry":
      return titleSnapshot === "Retry" && modeSnapshot === "manual"
        ? Object.freeze({ kind: "retry", title: "Retry", mode: "manual" })
        : undefined;
    default:
      return undefined;
  }
}

function snapshotRecoveryActions(source: unknown): readonly ErrorRecoveryAction[] | undefined {
  try {
    if (!Array.isArray(source)) return undefined;
  } catch {
    return undefined;
  }

  const lengthSnapshot = readProperty(source, "length");
  if (
    typeof lengthSnapshot !== "number" ||
    !Number.isSafeInteger(lengthSnapshot) ||
    lengthSnapshot < 0 ||
    lengthSnapshot > 2
  ) {
    return undefined;
  }

  const actions: ErrorRecoveryAction[] = [];
  const kinds = new Set<string>();

  for (let index = 0; index < lengthSnapshot; index += 1) {
    const actionSource = readProperty(source, String(index));
    const action = snapshotRecoveryAction(actionSource);
    if (!action || kinds.has(action.kind)) return undefined;
    kinds.add(action.kind);
    actions.push(action);
  }

  return Object.freeze(actions);
}

function canonicalReadPresentation(kind: unknown): ErrorPresentation | undefined {
  switch (kind) {
    case "authentication":
      return authenticationReadPresentation;
    case "permission":
      return permissionReadPresentation;
    case "rate-limit":
      return rateLimitReadPresentation;
    case "network":
      return networkReadPresentation;
    case "partial-refresh":
      return partialRefreshReadPresentation;
    case "protocol":
      return protocolReadPresentation;
    case "validation":
      return validationReadPresentation;
    case "unknown":
      return unknownReadPresentation;
    default:
      return undefined;
  }
}

function recoveryActionsMatch(
  actual: readonly ErrorRecoveryAction[],
  expected: readonly ErrorRecoveryAction[]
): boolean {
  return actual.length === expected.length && actual.every((action, index) => action.kind === expected[index].kind);
}

function snapshotReadPresentation(source: unknown): ErrorPresentation | undefined {
  const kindSnapshot = readProperty(source, "kind");
  const titleSnapshot = readProperty(source, "title");
  const messageSnapshot = readProperty(source, "message");
  const severitySnapshot = readProperty(source, "severity");
  const retainDataSnapshot = readProperty(source, "retainData");
  const actionsSnapshot = snapshotRecoveryActions(readProperty(source, "actions"));
  const canonical = canonicalReadPresentation(kindSnapshot);

  if (
    !canonical ||
    titleSnapshot !== canonical.title ||
    messageSnapshot !== canonical.message ||
    severitySnapshot !== canonical.severity ||
    retainDataSnapshot !== canonical.retainData ||
    !actionsSnapshot ||
    !recoveryActionsMatch(actionsSnapshot, canonical.actions)
  ) {
    return undefined;
  }

  return canonical;
}

function contextNotice(stale: boolean, partial: boolean, warning: string | undefined): TaskHealthNotice | undefined {
  if (stale && partial) {
    return Object.freeze({
      id: "ticktick-data-health-warning",
      kind: "stale-partial",
      title: "Cached Tasks May Be Incomplete",
      description: warning ?? "Showing cached tasks; some TickTick lists could not be refreshed.",
      icon: "important",
      presentation: contextRefreshPresentation,
    });
  }

  if (stale) {
    return Object.freeze({
      id: "ticktick-data-health-warning",
      kind: "stale",
      title: "Showing Cached Tasks",
      description: warning ?? "Showing the most recently available TickTick tasks.",
      icon: "clock",
      presentation: contextRefreshPresentation,
    });
  }

  if (partial) {
    return Object.freeze({
      id: "ticktick-data-health-warning",
      kind: "partial",
      title: "Some Tasks May Be Missing",
      description: warning ?? "Some TickTick lists could not be refreshed.",
      icon: "warning",
      presentation: contextRefreshPresentation,
    });
  }

  if (!warning) return undefined;
  return Object.freeze({
    id: "ticktick-data-health-warning",
    kind: "warning",
    title: "TickTick Data Notice",
    description: warning,
    icon: "warning",
    presentation: contextRefreshPresentation,
  });
}

export function buildTaskHealthNotices(health: TaskListHealth): readonly TaskHealthNotice[] {
  const freshnessSnapshot = readProperty(health, "freshness");
  const partialSnapshot = readProperty(health, "isPartial");
  const warningSnapshot = printableSingleLine(readProperty(health, "warning"));
  const readPresentation = snapshotReadPresentation(readProperty(health, "readError"));
  const context = contextNotice(freshnessSnapshot === "stale", partialSnapshot === true, warningSnapshot);
  const notices: TaskHealthNotice[] = [];

  if (context) notices.push(context);
  if (readPresentation) {
    notices.push(
      Object.freeze({
        id: "ticktick-retained-read-error",
        kind: "read-error",
        title: readPresentation.title,
        description: readPresentation.message,
        icon: readPresentation.severity === "error" ? "error" : "warning",
        presentation: readPresentation,
      })
    );
  }

  return Object.freeze(notices);
}

export function buildEmptyStateHealthDescription(health: TaskListHealth): string | undefined {
  const notices = buildTaskHealthNotices(health);
  if (notices.length === 0) return undefined;
  return notices.map((notice) => `${notice.title}: ${notice.description}`).join("\n");
}

const icons: Readonly<Record<TaskHealthNoticeIcon, Icon>> = Object.freeze({
  clock: Icon.Clock,
  warning: Icon.Warning,
  important: Icon.ExclamationMark,
  error: Icon.ExclamationMark,
});

export function StaleDataWarning({
  health,
  hasResults,
  onReconnect,
  onOpenPreferences,
  onRefresh,
  onRetry,
}: StaleDataWarningProps): ReactElement | null {
  if (!hasResults) return null;
  const notices = buildTaskHealthNotices(health);
  if (notices.length === 0) return null;

  const handlers: Omit<ConnectionActionsProps, "presentation"> = {
    onReconnect,
    onOpenPreferences,
    onRefresh,
    onRetry,
  };

  return (
    <Fragment>
      {notices.map((notice) => (
        <List.Item
          key={notice.id}
          id={notice.id}
          title={notice.title}
          subtitle={notice.description}
          icon={icons[notice.icon]}
          actions={
            <ActionPanel>
              <ConnectionActions presentation={notice.presentation} {...handlers} />
            </ActionPanel>
          }
        />
      ))}
    </Fragment>
  );
}

export default StaleDataWarning;
