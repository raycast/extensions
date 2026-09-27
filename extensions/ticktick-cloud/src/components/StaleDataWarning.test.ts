import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { presentError, type ErrorPresentation } from "../application/errorPresentation";
import {
  AmbiguousMutationError,
  AuthenticationError,
  NetworkError,
  NotFoundError,
  PartialRefreshError,
  PermissionError,
  ProtocolError,
  RateLimitError,
  ValidationError,
} from "../domain/errors";
import { ConnectionActions, type ConnectionActionsProps } from "./ConnectionActions";
import {
  buildEmptyStateHealthDescription,
  buildTaskHealthNotices,
  StaleDataWarning,
  type StaleDataWarningProps,
} from "./StaleDataWarning";
import type { TaskListHealth } from "./taskListModel";

vi.mock("@raycast/api", () => ({
  Action: function MockAction() {
    return null;
  },
  ActionPanel: Object.assign(
    function MockActionPanel() {
      return null;
    },
    {
      Section: function MockActionPanelSection() {
        return null;
      },
    }
  ),
  Icon: {
    Clock: "icon-clock",
    Warning: "icon-warning",
    ExclamationMark: "icon-important",
  },
  List: {
    Item: function MockListItem() {
      return null;
    },
  },
}));

const refreshAction = Object.freeze({ kind: "refresh", title: "Refresh" } as const);
const retryAction = Object.freeze({ kind: "retry", title: "Retry", mode: "manual" } as const);
const reconnectAction = Object.freeze({ kind: "reconnect", title: "Reconnect" } as const);
const preferencesAction = Object.freeze({ kind: "open-preferences", title: "Open Preferences" } as const);

function networkPresentation(): ErrorPresentation {
  return Object.freeze({
    kind: "network",
    title: "TickTick Is Unreachable",
    message: "Couldn't reach TickTick. Available tasks may be out of date.",
    severity: "error",
    retainData: true,
    actions: Object.freeze([refreshAction] as const),
  });
}

function rateLimitPresentation(): ErrorPresentation {
  return Object.freeze({
    kind: "rate-limit",
    title: "TickTick Is Temporarily Busy",
    message: "TickTick is limiting requests. Retry manually when ready.",
    severity: "warning",
    retainData: true,
    actions: Object.freeze([retryAction] as const),
    retryAfterMs: 12_000,
  });
}

function authenticationPresentation(): ErrorPresentation {
  return Object.freeze({
    kind: "authentication",
    title: "Reconnect TickTick",
    message: "Your TickTick connection is no longer valid. Reconnect or update authentication in preferences.",
    severity: "error",
    retainData: true,
    actions: Object.freeze([reconnectAction, preferencesAction] as const),
  });
}

function health(overrides: Partial<TaskListHealth> = {}): TaskListHealth {
  return { freshness: "fresh", isPartial: false, ...overrides };
}

type ListItemProps = Readonly<{
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  actions?: ReactElement<ActionPanelProps>;
}>;

type ActionPanelProps = Readonly<{ children?: ReactNode }>;
type ActionProps = Readonly<{ title: string; onAction: () => void | Promise<void> }>;

function directElements(node: ReactNode): ReactElement[] {
  const children = Array.isArray(node) ? node : node === undefined || node === null ? [] : [node];
  return children.filter(
    (child): child is ReactElement => typeof child === "object" && child !== null && "props" in child
  );
}

function renderRows(props: StaleDataWarningProps): ReactElement<ListItemProps>[] {
  const rendered = StaleDataWarning(props);
  if (rendered === null) return [];
  return directElements(
    (rendered.props as Readonly<{ children?: ReactNode }>).children
  ) as ReactElement<ListItemProps>[];
}

function connectionProps(row: ReactElement<ListItemProps>): ConnectionActionsProps {
  const panel = row.props.actions;
  if (!panel) throw new Error("Expected an action panel");
  const [connection] = directElements(panel.props.children);
  return connection.props as ConnectionActionsProps;
}

function renderedActions(row: ReactElement<ListItemProps>): ReactElement<ActionProps>[] {
  const section = ConnectionActions(connectionProps(row));
  if (!section) return [];
  return directElements((section.props as Readonly<{ children?: ReactNode }>).children) as ReactElement<ActionProps>[];
}

describe("task health notice model", () => {
  it("returns no notice or empty description for completely healthy data", () => {
    const healthy = health();

    expect(buildTaskHealthNotices(healthy)).toEqual([]);
    expect(buildEmptyStateHealthDescription(healthy)).toBeUndefined();
    expect(Object.isFrozen(buildTaskHealthNotices(healthy))).toBe(true);
  });

  it.each([
    [
      "stale",
      health({ freshness: "stale", warning: "Refreshing TickTick. Showing cached data from 2 minutes ago." }),
      {
        id: "ticktick-data-health-warning",
        kind: "stale",
        title: "Showing Cached Tasks",
        description: "Refreshing TickTick. Showing cached data from 2 minutes ago.",
        icon: "clock",
      },
    ],
    [
      "partial",
      health({ isPartial: true, warning: "Some TickTick lists could not be refreshed." }),
      {
        id: "ticktick-data-health-warning",
        kind: "partial",
        title: "Some Tasks May Be Missing",
        description: "Some TickTick lists could not be refreshed.",
        icon: "warning",
      },
    ],
    [
      "stale and partial",
      health({ freshness: "stale", isPartial: true, warning: "Cached data is incomplete." }),
      {
        id: "ticktick-data-health-warning",
        kind: "stale-partial",
        title: "Cached Tasks May Be Incomplete",
        description: "Cached data is incomplete.",
        icon: "important",
      },
    ],
    [
      "warning only",
      health({ warning: "TickTick returned a safe application warning." }),
      {
        id: "ticktick-data-health-warning",
        kind: "warning",
        title: "TickTick Data Notice",
        description: "TickTick returned a safe application warning.",
        icon: "warning",
      },
    ],
  ] as const)("builds fixed copy and icon for %s health", (_name, input, expected) => {
    const notices = buildTaskHealthNotices(input);

    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject(expected);
    expect(notices[0].presentation.actions).toEqual([refreshAction]);
  });

  it.each([
    [health({ freshness: "stale" }), "Showing the most recently available TickTick tasks."],
    [health({ isPartial: true }), "Some TickTick lists could not be refreshed."],
    [
      health({ freshness: "stale", isPartial: true }),
      "Showing cached tasks; some TickTick lists could not be refreshed.",
    ],
  ])("uses a fixed safe fallback when a data-health warning is absent", (input, expectedDescription) => {
    expect(buildTaskHealthNotices(input)[0].description).toBe(expectedDescription);
  });

  it("preserves a retained read error's fixed presentation title, message, and actions", () => {
    const presentation = networkPresentation();
    const [notice] = buildTaskHealthNotices(health({ readError: presentation }));

    expect(notice).toMatchObject({
      id: "ticktick-retained-read-error",
      kind: "read-error",
      title: presentation.title,
      description: presentation.message,
      icon: "error",
    });
    expect(notice.presentation).toEqual(presentation);
    expect(notice.presentation.actions).toEqual([refreshAction]);
  });

  it.each([
    ["authentication", presentError(new AuthenticationError("PRIVATE"), "read")],
    ["permission", presentError(new PermissionError("PRIVATE"), "read")],
    ["rate limit", presentError(new RateLimitError("PRIVATE"), "read")],
    ["network", presentError(new NetworkError("PRIVATE"), "read")],
    ["partial refresh", presentError(new PartialRefreshError("PRIVATE"), "read")],
    ["protocol", presentError(new ProtocolError("PRIVATE"), "read")],
    ["validation", presentError(new ValidationError("PRIVATE"), "read")],
    ["unknown", presentError(new Error("PRIVATE"), "read")],
  ] as const)("accepts only the canonical retained %s read presentation", (_name, presentation) => {
    const [notice] = buildTaskHealthNotices(health({ readError: presentation }));

    expect(notice.presentation).toEqual(presentation);
    expect(notice.presentation).not.toBe(presentation);
    expect(Object.isFrozen(notice.presentation)).toBe(true);
    expect(Object.isFrozen(notice.presentation.actions)).toBe(true);
    expect(notice.presentation.actions.every(Object.isFrozen)).toBe(true);
  });

  it("rejects arbitrary printable title and message copies without reflecting them", () => {
    const marker = "PRIVATE-MARKER-printable-forgery";
    const forged = {
      ...networkPresentation(),
      title: marker,
      message: marker,
    } as ErrorPresentation;

    const notices = buildTaskHealthNotices(health({ readError: forged }));

    expect(notices).toEqual([]);
    expect(JSON.stringify(notices)).not.toContain(marker);
  });

  it("rejects the mutation-only network Retry presentation in read health", () => {
    const mutationNetwork = presentError(new NetworkError("PRIVATE"), "mutation");

    expect(mutationNetwork.actions).toEqual([retryAction]);
    expect(buildTaskHealthNotices(health({ readError: mutationNetwork }))).toEqual([]);
  });

  it("rejects canonical non-retained not-found and mutation-only ambiguous presentations", () => {
    const notFound = presentError(new NotFoundError("PRIVATE"), "read");
    const ambiguous = presentError(new AmbiguousMutationError("PRIVATE"), "mutation");

    expect(notFound.retainData).toBe(false);
    expect(buildTaskHealthNotices(health({ readError: notFound }))).toEqual([]);
    expect(buildTaskHealthNotices(health({ readError: ambiguous }))).toEqual([]);
  });

  it.each([
    ["title", { title: "Permission Required" }],
    ["message", { message: "TickTick returned different copy." }],
    ["severity", { severity: "warning" }],
    ["retainData", { retainData: false }],
    ["actions", { actions: Object.freeze([preferencesAction, reconnectAction]) }],
  ] as const)("rejects a canonical kind with mismatched fixed %s", (_field, override) => {
    const mismatched = {
      ...authenticationPresentation(),
      ...override,
    } as unknown as ErrorPresentation;

    expect(buildTaskHealthNotices(health({ readError: mismatched }))).toEqual([]);
  });

  it("keeps stale/partial context before a retained read error without hiding either", () => {
    const presentation = rateLimitPresentation();
    const notices = buildTaskHealthNotices(
      health({ freshness: "stale", isPartial: true, warning: "Cached data is incomplete.", readError: presentation })
    );

    expect(notices.map((notice) => notice.kind)).toEqual(["stale-partial", "read-error"]);
    expect(notices.map((notice) => notice.title)).toEqual(["Cached Tasks May Be Incomplete", presentation.title]);
    expect(notices[0].description).toBe("Cached data is incomplete.");
    expect(notices[1].description).toBe(presentation.message);
    expect(notices[1].presentation.actions).toEqual([retryAction]);
  });

  it("builds an ordered EmptyView description independently of warning rows", () => {
    const presentation = networkPresentation();
    const input = health({
      freshness: "stale",
      warning: "Refreshing TickTick. Showing cached data.",
      readError: presentation,
    });

    expect(buildEmptyStateHealthDescription(input)).toBe(
      "Showing Cached Tasks: Refreshing TickTick. Showing cached data.\n" +
        "TickTick Is Unreachable: Couldn't reach TickTick. Available tasks may be out of date."
    );
  });

  it("returns deeply immutable notices without mutating the accepted health model", () => {
    const input = Object.freeze(
      health({ freshness: "stale", warning: "Cached data is shown.", readError: authenticationPresentation() })
    );
    const before = JSON.stringify(input);
    const notices = buildTaskHealthNotices(input);

    expect(Object.isFrozen(notices)).toBe(true);
    expect(notices.every(Object.isFrozen)).toBe(true);
    expect(notices.every((notice) => Object.isFrozen(notice.presentation))).toBe(true);
    expect(notices.every((notice) => Object.isFrozen(notice.presentation.actions))).toBe(true);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("snapshots hostile health accessors once and omits a hostile warning while retaining fixed context", () => {
    const reads = new Map<string, number>();
    const readOnce = <Value>(key: string, value: Value): Value => {
      const count = (reads.get(key) ?? 0) + 1;
      reads.set(key, count);
      if (count > 1) throw new Error(`PRIVATE-MARKER-repeat-${key}`);
      return value;
    };
    const hostile = Object.defineProperties(
      {},
      {
        freshness: { enumerable: true, get: () => readOnce("freshness", "stale") },
        isPartial: { enumerable: true, get: () => readOnce("partial", true) },
        warning: { enumerable: true, get: () => readOnce("warning", "hostile\u0000warning") },
        readError: { enumerable: true, get: () => readOnce("error", undefined) },
      }
    ) as TaskListHealth;

    const notices = buildTaskHealthNotices(hostile);

    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({
      kind: "stale-partial",
      description: "Showing cached tasks; some TickTick lists could not be refreshed.",
    });
    expect(JSON.stringify(notices)).not.toContain("hostile");
    expect([...reads.values()]).toEqual([1, 1, 1, 1]);
  });

  it("treats throwing health or read-error accessors as absent without throwing or leaking", () => {
    const marker = "PRIVATE-MARKER-hostile-health-getter";
    const hostileHealth = Object.defineProperties(
      {},
      {
        freshness: { get: () => "stale" },
        isPartial: { get: () => false },
        warning: {
          get() {
            throw new Error(marker);
          },
        },
        readError: {
          get() {
            throw new Error(marker);
          },
        },
      }
    ) as TaskListHealth;
    const hostileError = Object.defineProperty({}, "title", {
      get() {
        throw new Error(marker);
      },
    }) as ErrorPresentation;

    expect(() => buildTaskHealthNotices(hostileHealth)).not.toThrow();
    expect(buildTaskHealthNotices(hostileHealth)[0]).toMatchObject({ kind: "stale" });
    expect(buildTaskHealthNotices(health({ readError: hostileError }))).toEqual([]);
    expect(JSON.stringify(buildTaskHealthNotices(hostileHealth))).not.toContain(marker);
  });

  it("fails closed when a hostile read-error actions collection throws", () => {
    const marker = "PRIVATE-MARKER-hostile-actions";
    const hostileActions = new Proxy([refreshAction], {
      get() {
        throw new Error(marker);
      },
    });
    const hostileError = {
      ...networkPresentation(),
      actions: hostileActions,
    } as unknown as ErrorPresentation;

    expect(() => buildTaskHealthNotices(health({ readError: hostileError }))).not.toThrow();
    expect(buildTaskHealthNotices(health({ readError: hostileError }))).toEqual([]);
    expect(JSON.stringify(buildTaskHealthNotices(health({ readError: hostileError })))).not.toContain(marker);
  });

  it("does not copy private error descriptors, causes, bodies, or extra fields into notices", () => {
    const marker = "PRIVATE-MARKER-private-error-descriptor";
    const accepted = networkPresentation();
    const injected = {
      ...accepted,
      cause: marker,
      body: marker,
      response: marker,
      token: marker,
      actions: accepted.actions.map((action) => ({ ...action, privateData: marker })),
    } as unknown as ErrorPresentation;
    const notices = buildTaskHealthNotices(health({ readError: injected }));

    expect(notices).toHaveLength(1);
    expect(JSON.stringify(notices)).not.toContain(marker);
    expect(Object.keys(notices[0].presentation).sort()).toEqual([
      "actions",
      "kind",
      "message",
      "retainData",
      "severity",
      "title",
    ]);
  });
});

describe("StaleDataWarning result rows", () => {
  it("never renders warning rows for healthy data or as the mechanism for an empty list", () => {
    expect(renderRows({ health: health(), hasResults: true })).toEqual([]);
    expect(renderRows({ health: health({ freshness: "stale" }), hasResults: false })).toEqual([]);
    expect(buildEmptyStateHealthDescription(health({ freshness: "stale" }))).toBe(
      "Showing Cached Tasks: Showing the most recently available TickTick tasks."
    );
  });

  it("renders fixed-id context and retained-error rows alongside results in model order", () => {
    const rows = renderRows({
      health: health({ freshness: "stale", warning: "Cached data is shown.", readError: networkPresentation() }),
      hasResults: true,
      onRefresh: vi.fn(),
    });

    expect(rows.map((row) => row.props.id)).toEqual(["ticktick-data-health-warning", "ticktick-retained-read-error"]);
    expect(rows.map((row) => row.props.title)).toEqual(["Showing Cached Tasks", "TickTick Is Unreachable"]);
    expect(rows.map((row) => row.props.subtitle)).toEqual([
      "Cached data is shown.",
      "Couldn't reach TickTick. Available tasks may be out of date.",
    ]);
    expect(rows.map((row) => row.props.icon)).toEqual(["icon-clock", "icon-important"]);
  });

  it("renders context Refresh only through ConnectionActions and passes the handler through", async () => {
    const onRefresh = vi.fn(async () => undefined);
    const [row] = renderRows({ health: health({ isPartial: true }), hasResults: true, onRefresh });
    const connection = connectionProps(row);
    const actions = renderedActions(row);

    expect(connection.onRefresh).toBe(onRefresh);
    expect(connection.presentation.actions).toEqual([refreshAction]);
    expect(actions.map((action) => action.props.title)).toEqual(["Refresh"]);
    expect(actions[0].props.onAction).toBe(onRefresh);
    await actions[0].props.onAction();
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("preserves retained authentication actions and injected handlers through ConnectionActions", () => {
    const onReconnect = vi.fn();
    const onOpenPreferences = vi.fn();
    const [row] = renderRows({
      health: health({ readError: authenticationPresentation() }),
      hasResults: true,
      onReconnect,
      onOpenPreferences,
    });
    const actions = renderedActions(row);

    expect(actions.map((action) => action.props.title)).toEqual(["Reconnect", "Open Preferences"]);
    expect(actions.map((action) => action.props.onAction)).toEqual([onReconnect, onOpenPreferences]);
  });

  it("propagates manual recovery rejection without rendering its raw message", async () => {
    const marker = "PRIVATE-MARKER-refresh-rejection";
    const failure = new Error(marker);
    const onRefresh = vi.fn(async () => {
      throw failure;
    });
    const [row] = renderRows({ health: health({ freshness: "stale" }), hasResults: true, onRefresh });
    const [action] = renderedActions(row);

    await expect(action.props.onAction()).rejects.toBe(failure);
    expect(JSON.stringify(row)).not.toContain(marker);
  });

  it("uses stable non-user-data ids and never places warning text in ids or action descriptors", () => {
    const marker = "PRIVATE-MARKER-visible-safe-warning";
    const [row] = renderRows({
      health: health({ freshness: "stale", warning: marker }),
      hasResults: true,
      onRefresh: vi.fn(),
    });
    const actions = renderedActions(row);

    expect(row.props.id).toBe("ticktick-data-health-warning");
    expect(row.props.id).not.toContain(marker);
    expect(row.props.subtitle).toBe(marker);
    expect(JSON.stringify(actions.map((action) => ({ title: action.props.title })))).not.toContain(marker);
  });

  it("keeps the production slice free of services, backends, cache, network, task actions, logging, and toasts", () => {
    const source = readFileSync(resolve(__dirname, "StaleDataWarning.tsx"), "utf8");
    const imports = Array.from(source.matchAll(/from\s+["']([^"']+)["']/g), (match) => match[1]).sort();

    expect(imports).toEqual([
      "../application/errorPresentation",
      "./ConnectionActions",
      "./taskListModel",
      "@raycast/api",
      "react",
    ]);
    expect(source).not.toMatch(
      /\b(?:TickTickService|TickTickBackend|TaskRepository|Cache)\b|fetch\s*\(|console\.|showToast|Toast/
    );
    expect(source).not.toMatch(
      /\b(?:completeTask|reopenTask|editTask|moveTask|onComplete|onReopen|onEdit|onMove)\b|taskId|projectId|projectName|cause|responseBody|statusCode/
    );
    expect(source).not.toMatch(/setTimeout|setInterval|retryAfter/);
  });
});
