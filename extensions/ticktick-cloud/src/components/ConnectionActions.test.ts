import type { Keyboard } from "@raycast/api";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

import type { ErrorPresentation } from "../application/errorPresentation";
import {
  buildConnectionActionItems,
  ConnectionActions,
  type ConnectionActionItem,
  type ConnectionActionKey,
  type ConnectionActionsProps,
  type ConnectionActionShortcut,
} from "./ConnectionActions";

vi.mock("@raycast/api", () => ({
  Action: function MockAction() {
    return null;
  },
  ActionPanel: {
    Section: function MockActionPanelSection() {
      return null;
    },
  },
}));

const reconnectAction = Object.freeze({ kind: "reconnect", title: "Reconnect" } as const);
const openPreferencesAction = Object.freeze({ kind: "open-preferences", title: "Open Preferences" } as const);
const refreshAction = Object.freeze({ kind: "refresh", title: "Refresh" } as const);
const retryAction = Object.freeze({ kind: "retry", title: "Retry", mode: "manual" } as const);

function authenticationPresentation(message = "Reconnect safely"): ErrorPresentation {
  return {
    kind: "authentication",
    title: "Reconnect TickTick",
    message,
    severity: "error",
    retainData: true,
    actions: [reconnectAction, openPreferencesAction],
  };
}

function permissionPresentation(): ErrorPresentation {
  return {
    kind: "permission",
    title: "Permission Required",
    message: "Check authentication settings",
    severity: "error",
    retainData: true,
    actions: [openPreferencesAction],
  };
}

function notFoundPresentation(): ErrorPresentation {
  return {
    kind: "not-found",
    title: "Task No Longer Available",
    message: "Refresh the list",
    severity: "warning",
    retainData: false,
    actions: [refreshAction],
  };
}

function rateLimitPresentation(retryAfterMs?: number): ErrorPresentation {
  return {
    kind: "rate-limit",
    title: "TickTick Is Temporarily Busy",
    message: "Retry manually",
    severity: "warning",
    retainData: true,
    actions: [retryAction],
    ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
  };
}

function validationPresentation(): ErrorPresentation {
  return {
    kind: "validation",
    title: "Invalid Task Details",
    message: "Review the task details",
    severity: "error",
    retainData: true,
    actions: [],
  };
}

type RenderedActionProps = Readonly<{
  title: string;
  shortcut: Keyboard.Shortcut;
  onAction: () => void | Promise<void>;
}>;

function renderedActions(props: ConnectionActionsProps): ReactElement<RenderedActionProps>[] {
  const section = ConnectionActions(props);
  if (section === null) return [];

  const sectionProps = section.props as Readonly<{ children?: ReactNode }>;
  return Children.toArray(sectionProps.children).filter(isValidElement) as ReactElement<RenderedActionProps>[];
}

function actionKeys(items: readonly ConnectionActionItem[]): ConnectionActionKey[] {
  return items.map((item) => item.key);
}

describe("connection action model", () => {
  it("keeps the public action-key and shortcut types exact", () => {
    expectTypeOf<ConnectionActionKey>().toEqualTypeOf<"reconnect" | "open-preferences" | "refresh" | "retry">();
    expectTypeOf<ConnectionActionShortcut>().toEqualTypeOf<Keyboard.Shortcut>();
  });

  it("maps every recovery action to a fixed descriptor in presentation order", () => {
    expect(buildConnectionActionItems(authenticationPresentation())).toEqual([
      expect.objectContaining({ key: "reconnect", title: "Reconnect" }),
      expect.objectContaining({ key: "open-preferences", title: "Open Preferences" }),
    ]);
    expect(actionKeys(buildConnectionActionItems(permissionPresentation()))).toEqual(["open-preferences"]);
    expect(actionKeys(buildConnectionActionItems(notFoundPresentation()))).toEqual(["refresh"]);
    expect(actionKeys(buildConnectionActionItems(rateLimitPresentation(12_000)))).toEqual(["retry"]);
    expect(buildConnectionActionItems(validationPresentation())).toEqual([]);
  });

  it("uses explicit Raycast-compatible platform shortcuts without cmd on Windows", () => {
    const items = [
      ...buildConnectionActionItems(authenticationPresentation()),
      ...buildConnectionActionItems(notFoundPresentation()),
      ...buildConnectionActionItems(rateLimitPresentation()),
    ];

    for (const item of items) {
      const shortcut: Keyboard.Shortcut = item.shortcut;
      expect("macOS" in shortcut).toBe(true);
      expect("Windows" in shortcut).toBe(true);
      if (!("macOS" in shortcut) || !("Windows" in shortcut)) throw new Error("Expected a platform shortcut");

      expect(shortcut.macOS.modifiers.length).toBeGreaterThan(0);
      expect(shortcut.Windows.modifiers.length).toBeGreaterThan(0);
      expect(shortcut.Windows.modifiers).not.toContain("cmd");
    }
  });

  it("never copies presentation titles, messages, or retry metadata into action descriptors", () => {
    const marker = "PRIVATE-MARKER-connection-action";
    const presentations: ErrorPresentation[] = [
      authenticationPresentation(marker),
      {
        ...rateLimitPresentation(51_234),
        title: marker,
        message: marker,
      },
    ];

    const serialized = JSON.stringify(presentations.flatMap(buildConnectionActionItems));
    expect(serialized).not.toContain(marker);
    expect(serialized).not.toContain("51234");
    for (const item of presentations.flatMap(buildConnectionActionItems)) {
      expect(Object.keys(item).sort()).toEqual(["key", "shortcut", "title"]);
    }
  });

  it("returns deeply immutable descriptors without mutating a frozen presentation", () => {
    const actions = Object.freeze([reconnectAction, openPreferencesAction] as const);
    const presentation = Object.freeze({
      kind: "authentication" as const,
      title: "Reconnect TickTick",
      message: "Reconnect safely",
      severity: "error" as const,
      retainData: true,
      actions,
    }) satisfies ErrorPresentation;

    const items = buildConnectionActionItems(presentation);

    expect(Object.isFrozen(items)).toBe(true);
    expect(items.every(Object.isFrozen)).toBe(true);
    for (const item of items) {
      expect(Object.isFrozen(item.shortcut)).toBe(true);
      if (!("macOS" in item.shortcut) || !("Windows" in item.shortcut)) throw new Error("Expected a platform shortcut");
      expect(Object.isFrozen(item.shortcut.macOS)).toBe(true);
      expect(Object.isFrozen(item.shortcut.macOS.modifiers)).toBe(true);
      expect(Object.isFrozen(item.shortcut.Windows)).toBe(true);
      expect(Object.isFrozen(item.shortcut.Windows.modifiers)).toBe(true);
    }
    expect(presentation.actions).toBe(actions);
    expect(presentation.actions).toEqual([reconnectAction, openPreferencesAction]);
  });
});

describe("ConnectionActions", () => {
  it("renders only actions that have handlers while preserving presentation order", () => {
    const onReconnect = vi.fn();
    const onOpenPreferences = vi.fn();
    const actions = renderedActions({
      presentation: authenticationPresentation(),
      onReconnect,
      onOpenPreferences,
    });

    expect(actions.map((action) => action.props.title)).toEqual(["Reconnect", "Open Preferences"]);
    expect(actions.map((action) => action.props.onAction)).toEqual([onReconnect, onOpenPreferences]);

    const preferencesOnly = renderedActions({
      presentation: authenticationPresentation(),
      onOpenPreferences,
    });
    expect(preferencesOnly.map((action) => action.props.title)).toEqual(["Open Preferences"]);
  });

  it("renders no section when the presentation has no actions or no matching handlers", () => {
    expect(renderedActions({ presentation: validationPresentation() })).toEqual([]);
    expect(renderedActions({ presentation: authenticationPresentation() })).toEqual([]);
    expect(renderedActions({ presentation: notFoundPresentation(), onRetry: vi.fn() })).toEqual([]);
  });

  it.each([
    ["Reconnect", authenticationPresentation(), "onReconnect"],
    ["Open Preferences", permissionPresentation(), "onOpenPreferences"],
    ["Refresh", notFoundPresentation(), "onRefresh"],
    ["Retry", rateLimitPresentation(), "onRetry"],
  ] as const)(
    "passes the %s handler through exactly once per action invocation",
    async (_title, presentation, prop) => {
      const handler = vi.fn(async () => undefined);
      const props = { presentation, [prop]: handler } as ConnectionActionsProps;
      const [action] = renderedActions(props);

      expect(action.props.onAction).toBe(handler);
      await action.props.onAction();
      expect(handler).toHaveBeenCalledTimes(1);
    }
  );

  it("propagates callback rejection without rendering the raw failure message", async () => {
    const failure = new Error("PRIVATE-MARKER-rejected-callback");
    const onRetry = vi.fn(async () => {
      throw failure;
    });
    const [action] = renderedActions({ presentation: rateLimitPresentation(10_000), onRetry });

    await expect(action.props.onAction()).rejects.toBe(failure);
    expect(action.props.title).toBe("Retry");
    expect(JSON.stringify({ title: action.props.title, shortcut: action.props.shortcut })).not.toContain(
      "PRIVATE-MARKER"
    );
  });
});
