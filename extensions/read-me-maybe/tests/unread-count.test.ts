import { describe, expect, it, vi } from "vitest";

import { classifyDockError, deserializeDockOutcomes } from "../src/dock-scan-protocol";
import {
  accessCheckPrompt,
  migrateAccessState,
  recordBackgroundAccessResult,
  recordExplicitAccessCheck,
  type AccessCheckState,
} from "../src/domain/access-check-state";
import { DockScanCoordinator } from "../src/domain/dock-scan-coordinator";
import type { StoredSource } from "../src/domain/source-catalog";
import {
  enabledSources,
  interpretBadge,
  menuPresentation,
  openCommandForSource,
  relativeFreshness,
  summarizeDockScan,
  transitionSetupGate,
  type DockScan,
  type Source,
} from "../src/domain/unread-count";

const slackRow: StoredSource = {
  id: "slack",
  name: "Slack",
  dockName: "Slack",
  appPath: "/Applications/Slack.app",
  enabled: true,
};
const messagesRow: StoredSource = {
  id: "messages",
  name: "Messages",
  dockName: "Messages",
  appPath: "/System/Applications/Messages.app",
  openCommand: "open /System/Applications/Messages.app",
  enabled: true,
};
const telegramRow: StoredSource = { id: "telegram", name: "Telegram", dockName: "Telegram", enabled: true };
const allRows: StoredSource[] = [slackRow, messagesRow, telegramRow];
const allSources: Source[] = allRows.map((row) => row.id);

describe("enabledSources", () => {
  it("keeps only enabled Catalog rows in stored order", () => {
    const disabled: StoredSource = { id: "u1", name: "Telegram Lite", dockName: "Telegram Lite", enabled: false };

    expect(enabledSources([slackRow, disabled, telegramRow])).toEqual([slackRow, telegramRow]);
  });
});

describe("openCommandForSource", () => {
  it("derives the default command from the app path, single-quoted so spaces stay safe", () => {
    expect(openCommandForSource(slackRow)).toBe("open '/Applications/Slack.app'");
    expect(openCommandForSource({ ...slackRow, appPath: "/Applications/My App.app" })).toBe(
      "open '/Applications/My App.app'",
    );
  });

  it("escapes an app path that contains a single quote", () => {
    expect(openCommandForSource({ ...slackRow, appPath: "/Applications/Bob's App.app" })).toBe(
      "open '/Applications/Bob'\\''s App.app'",
    );
  });

  it("prefers a configured command, falling back when it is unset or whitespace-only", () => {
    expect(openCommandForSource(messagesRow)).toBe("open /System/Applications/Messages.app");
    expect(openCommandForSource({ ...slackRow, openCommand: "  open -a Slack " })).toBe("open -a Slack");
    expect(openCommandForSource({ ...slackRow, openCommand: "   " })).toBe("open '/Applications/Slack.app'");
  });

  it("resolves to no command for a row with neither an override nor an app path", () => {
    expect(openCommandForSource(telegramRow)).toBe("");
  });
});

describe("interpretBadge", () => {
  it.each([
    [undefined, { kind: "zero", label: "0", contribution: 0 }],
    ["", { kind: "zero", label: "0", contribution: 0 }],
    [" 42 ", { kind: "numeric", label: "42", contribution: 42 }],
    ["9+", { kind: "threshold", label: "9+", contribution: 9 }],
    ["•", { kind: "attention", label: "Unread activity", contribution: 0 }],
    ["·", { kind: "attention", label: "Unread activity", contribution: 0 }],
    [".", { kind: "attention", label: "Unread activity", contribution: 0 }],
  ] as const)("interprets %j as a user-visible Badge state", (badge, expected) => {
    expect(interpretBadge(badge)).toEqual(expected);
  });

  it("does not guess an Unread Count from an invalid Badge", () => {
    expect(interpretBadge("unread: 9")).toEqual({ kind: "couldNotReadBadge", label: "Could not read badge" });
  });
});

describe("summarizeDockScan", () => {
  it("creates a complete aggregate when every Source is readable", () => {
    expect(
      summarizeDockScan(allRows, {
        kind: "success",
        outcomes: {
          slack: { kind: "badge", badge: "3" },
          messages: { kind: "badge", badge: undefined },
          telegram: { kind: "badge", badge: "•" },
        },
      }),
    ).toMatchObject({ aggregate: { kind: "complete", total: 3 } });
  });

  it("carries each Source's icon path and resolved Open Command into its result", () => {
    expect(summarizeDockScan(allRows, { kind: "success", outcomes: {} }).sources).toStrictEqual([
      {
        id: "slack",
        name: "Slack",
        appPath: "/Applications/Slack.app",
        openCommand: "open '/Applications/Slack.app'",
        label: "Not available",
        unavailable: true,
      },
      {
        id: "messages",
        name: "Messages",
        appPath: "/System/Applications/Messages.app",
        openCommand: "open /System/Applications/Messages.app",
        label: "Not available",
        unavailable: true,
      },
      {
        id: "telegram",
        name: "Telegram",
        openCommand: "",
        label: "Not available",
        unavailable: true,
      },
    ]);
  });

  it("excludes unread activity from the total while flagging its presence", () => {
    const scan = {
      kind: "success" as const,
      outcomes: {
        slack: { kind: "badge" as const, badge: "•" },
        messages: { kind: "badge" as const, badge: "" },
        telegram: { kind: "badge" as const, badge: "•" },
      },
    };

    expect(summarizeDockScan(allRows, scan).aggregate).toEqual({
      kind: "complete",
      total: 0,
      hasExcludedUnreadActivity: true,
    });
    expect(menuPresentation(summarizeDockScan(allRows, scan))).toMatchObject({
      title: undefined,
      hasExcludedUnreadActivity: true,
    });
  });

  it("marks excluded unread activity even when a numeric total is present", () => {
    const scan = {
      kind: "success" as const,
      outcomes: {
        slack: { kind: "badge" as const, badge: "•" },
        messages: { kind: "badge" as const, badge: "2" },
        telegram: { kind: "badge" as const, badge: "" },
      },
    };

    expect(summarizeDockScan(allRows, scan).aggregate).toEqual({
      kind: "complete",
      total: 2,
      hasExcludedUnreadActivity: true,
    });
    expect(menuPresentation(summarizeDockScan(allRows, scan))).toMatchObject({
      title: "2",
      hasExcludedUnreadActivity: true,
    });
  });

  it("renders zero only after every enabled Source is read successfully", () => {
    expect(
      summarizeDockScan(allRows, {
        kind: "success",
        outcomes: {
          slack: { kind: "badge", badge: "" },
          messages: { kind: "badge" },
          telegram: { kind: "badge", badge: "  " },
        },
      }).aggregate,
    ).toEqual({ kind: "complete", total: 0 });
  });

  it("marks readable and unavailable Sources as a Partial Result", () => {
    expect(
      summarizeDockScan(allRows, {
        kind: "success",
        outcomes: {
          slack: { kind: "badge", badge: "9+" },
          messages: { kind: "notAvailable" },
          telegram: { kind: "badge", badge: "" },
        },
      }),
    ).toMatchObject({
      aggregate: { kind: "partial", total: 9 },
      sources: [
        { id: "slack", label: "9+" },
        { id: "messages", label: "Not available" },
        { id: "telegram", label: "0" },
      ],
    });
  });

  it("labels every unreadable Source state without treating it as zero", () => {
    expect(
      summarizeDockScan(allRows, {
        kind: "success",
        outcomes: {
          slack: { kind: "notAvailable" },
          messages: { kind: "accessibilityRequired" },
          telegram: { kind: "automationRequired" },
        },
      }).sources.map((source) => source.label),
    ).toEqual(["Not available", "Accessibility required", "Automation required"]);
    expect(
      summarizeDockScan(allRows, {
        kind: "success",
        outcomes: {
          slack: { kind: "couldNotReadBadge" },
          messages: { kind: "notAvailable" },
          telegram: { kind: "notAvailable" },
        },
      }).sources[0].label,
    ).toBe("Could not read badge");
  });

  it("keeps per-Source diagnostics when a permission check fails", () => {
    expect(summarizeDockScan(allRows, { kind: "accessibilityRequired" })).toMatchObject({
      aggregate: { kind: "accessibilityRequired" },
      sources: [
        { id: "slack", label: "Accessibility required" },
        { id: "messages", label: "Accessibility required" },
        { id: "telegram", label: "Accessibility required" },
      ],
    });
  });

  it("distinguishes no readable Sources, no enabled Sources, and a failed snapshot", () => {
    expect(
      summarizeDockScan(allRows, {
        kind: "success",
        outcomes: {
          slack: { kind: "notAvailable" },
          messages: { kind: "accessibilityRequired" },
          telegram: { kind: "automationRequired" },
        },
      }).aggregate,
    ).toEqual({ kind: "empty" });
    expect(summarizeDockScan([], { kind: "success", outcomes: {} }).aggregate).toEqual({ kind: "noSources" });
    expect(summarizeDockScan(allRows, { kind: "failed" }).aggregate).toEqual({ kind: "failed" });
  });
});

describe("relativeFreshness", () => {
  const updatedAt = new Date("2026-08-27T19:00:00.000Z");
  const age = (milliseconds: number) => new Date(updatedAt.getTime() + milliseconds);

  it("reserves just now for a reading less than 15 seconds old", () => {
    expect(relativeFreshness(updatedAt, age(0))).toBe("just now");
    expect(relativeFreshness(updatedAt, age(14_999))).toBe("just now");
  });

  it("bridges 15 seconds to the first whole minute", () => {
    expect(relativeFreshness(updatedAt, age(15_000))).toBe("less than a minute ago");
    expect(relativeFreshness(updatedAt, age(59_999))).toBe("less than a minute ago");
  });

  it("counts whole minutes from the first minute on", () => {
    expect(relativeFreshness(updatedAt, age(60_000))).toBe("1 min ago");
    expect(relativeFreshness(updatedAt, age(119_999))).toBe("1 min ago");
    expect(relativeFreshness(updatedAt, age(180_000))).toBe("3 min ago");
  });

  it("treats a missing reading time as just now", () => {
    expect(relativeFreshness(undefined, age(180_000))).toBe("just now");
  });
});

describe("menuPresentation", () => {
  const updatedAt = new Date("2026-08-27T19:00:00.000Z");
  const now = new Date("2026-08-27T19:03:00.000Z");

  it("caps a complete menu-bar total and separates its last-updated label", () => {
    expect(menuPresentation({ sources: [], aggregate: { kind: "complete", total: 120 } }, updatedAt, now)).toEqual({
      title: "99+",
      lastUpdated: "Last Updated: 3 min ago",
      showSources: true,
    });
  });

  it("marks partial results incomplete while retaining their compact total", () => {
    expect(menuPresentation({ sources: [], aggregate: { kind: "partial", total: 9 } }, updatedAt, updatedAt)).toEqual({
      title: "9",
      status: "Partial Result (incomplete)",
      lastUpdated: "Last Updated: just now",
      showSources: true,
    });
  });

  it("shows a trustworthy zero only for a complete zero aggregate", () => {
    expect(
      menuPresentation({ sources: [], aggregate: { kind: "complete", total: 0 } }, updatedAt, updatedAt),
    ).toMatchObject({
      title: undefined,
      lastUpdated: "Last Updated: just now",
    });
  });

  it("does not present a total or source rows for a failed snapshot", () => {
    expect(menuPresentation({ sources: [], aggregate: { kind: "failed" } })).toEqual({
      title: "-",
      status: "Could not refresh",
      showSources: false,
    });
  });

  it("explains the unavailable aggregate states", () => {
    expect(menuPresentation({ sources: [], aggregate: { kind: "noSources" } })).toMatchObject({
      title: "-",
      status: "No sources enabled",
    });
    expect(menuPresentation({ sources: [], aggregate: { kind: "empty" } }, updatedAt, updatedAt)).toEqual({
      title: "-",
      status: "No readable Sources",
      lastUpdated: "Last Updated: just now",
      showSources: true,
    });
    expect(menuPresentation({ sources: [], aggregate: { kind: "accessibilityRequired" } })).toMatchObject({
      title: "-",
      status: "Accessibility access required",
      showSources: true,
    });
    expect(menuPresentation({ sources: [], aggregate: { kind: "automationRequired" } })).toMatchObject({
      title: "-",
      status: "Automation access required",
      showSources: true,
    });
  });
});

describe("Dock scan adapter", () => {
  it("deserializes a structured whole-Dock outcome without treating an absent Source as zero", () => {
    expect(deserializeDockOutcomes("Slack\tbadge\t4\nMessages\tnotAvailable\t\nTelegram\tbadge\t•\n", allRows)).toEqual(
      {
        slack: { kind: "badge", badge: "4" },
        messages: { kind: "notAvailable" },
        telegram: { kind: "badge", badge: "•" },
      },
    );
  });

  it("maps Dock item names through the requested Catalog rows, ignoring unrelated Dock items", () => {
    expect(deserializeDockOutcomes("Spotify\tbadge\t3\nMessages\tbadge\t2\n", [messagesRow])).toEqual({
      messages: { kind: "badge", badge: "2" },
    });
  });

  it("rejects malformed structured output instead of publishing a partial snapshot", () => {
    expect(deserializeDockOutcomes("Slack\tbadge\t4\n", allRows)).toBeUndefined();
  });

  it("classifies known permission failures without exposing raw script errors", () => {
    expect(classifyDockError(new Error("Not allowed assistive access (-25211)"))).toEqual({
      kind: "accessibilityRequired",
    });
    expect(classifyDockError(new Error("Not permitted to send Apple events to System Events (-1743)"))).toEqual({
      kind: "automationRequired",
    });
    expect(classifyDockError(new Error("Accessibility attribute was malformed"))).toEqual({ kind: "failed" });
  });
});

describe("access check state", () => {
  const checkedAt = new Date("2026-08-27T19:00:00.000Z");

  it("clears a legacy Setup Gate that has no Access Check Status", () => {
    expect(migrateAccessState({ setupGate: true })).toEqual({
      state: { setupGate: false },
      clearLegacyGate: true,
    });
  });

  it("keeps paired Setup Gates unchanged, with a closed gate taking precedence over a historical success", () => {
    const openState: AccessCheckState = {
      setupGate: true,
      accessCheckStatus: { kind: "success", checkedAt },
    };
    const closedState: AccessCheckState = { ...openState, setupGate: false };

    expect(migrateAccessState(openState)).toEqual({ state: openState, clearLegacyGate: false });
    expect(migrateAccessState(closedState)).toEqual({ state: closedState, clearLegacyGate: false });
  });

  it("retains explicit permission failures but leaves state unchanged after a transient failure", () => {
    const accessibilityFailure = recordExplicitAccessCheck(
      { setupGate: true, accessCheckStatus: { kind: "success", checkedAt } },
      allSources,
      { kind: "accessibilityRequired" },
      checkedAt,
    );
    expect(accessibilityFailure).toEqual({
      setupGate: false,
      accessCheckStatus: { kind: "accessibilityRequired", checkedAt },
    });
    expect(recordExplicitAccessCheck(accessibilityFailure, allSources, { kind: "failed" }, checkedAt)).toEqual(
      accessibilityFailure,
    );
  });

  it("replaces a retained explicit failure after a successful recheck", () => {
    expect(
      recordExplicitAccessCheck(
        { setupGate: false, accessCheckStatus: { kind: "automationRequired", checkedAt } },
        allSources,
        { kind: "success" },
        checkedAt,
      ),
    ).toEqual({
      setupGate: true,
      accessCheckStatus: { kind: "success", checkedAt },
    });
  });

  it("does not retain Badge, Source, aggregate, or message data in Access Check Status", () => {
    const state = recordExplicitAccessCheck({ setupGate: false }, allSources, { kind: "success" }, checkedAt);

    expect(Object.keys(state.accessCheckStatus ?? {}).sort()).toEqual(["checkedAt", "kind"]);
    expect(JSON.stringify(state)).not.toMatch(/badge|slack|messages|telegram|aggregate/i);
  });

  it("does not change access state when no Sources are enabled", () => {
    const state: AccessCheckState = { setupGate: false };
    expect(recordExplicitAccessCheck(state, [], { kind: "success" }, checkedAt)).toEqual(state);
  });

  it("gives no enabled Sources precedence over retained permission recovery", () => {
    const accessibilityFailure: AccessCheckState = {
      setupGate: false,
      accessCheckStatus: { kind: "accessibilityRequired", checkedAt },
    };

    expect(accessCheckPrompt(accessibilityFailure, 0)).toEqual({ kind: "noSources", message: "No sources enabled" });
    expect(accessCheckPrompt(accessibilityFailure, 1)).toEqual({
      kind: "accessibilityRequired",
      message: "Accessibility access required",
    });
  });

  it("requires a new Access Check when the Setup Gate is closed despite a historical success", () => {
    expect(
      accessCheckPrompt({ setupGate: false, accessCheckStatus: { kind: "success", checkedAt } }, allSources.length),
    ).toEqual({ kind: "required", message: "Access check required" });
  });
});

describe("background access state", () => {
  const checkedAt = new Date("2026-08-27T19:00:00.000Z");

  it("closes the Setup Gate for a live permission loss without replacing the retained Access Check Status", () => {
    const state: AccessCheckState = {
      setupGate: true,
      accessCheckStatus: { kind: "success", checkedAt },
    };
    const afterPermissionLoss = recordBackgroundAccessResult(state, { kind: "accessibilityRequired" });

    expect(afterPermissionLoss).toEqual({ setupGate: false, accessCheckStatus: { kind: "success", checkedAt } });
    expect(accessCheckPrompt(afterPermissionLoss, allSources.length, { kind: "accessibilityRequired" })).toEqual({
      kind: "accessibilityRequired",
      message: "Accessibility access required",
    });
    expect(accessCheckPrompt(afterPermissionLoss, allSources.length)).toEqual({
      kind: "required",
      message: "Access check required",
    });
  });

  it("does not reopen a Setup Gate from a successful scheduled scan", () => {
    const state: AccessCheckState = {
      setupGate: false,
      accessCheckStatus: { kind: "accessibilityRequired", checkedAt },
    };

    expect(recordBackgroundAccessResult(state, { kind: "success" })).toEqual(state);
  });
});

describe("DockScanCoordinator", () => {
  type DeferredScan = { promise: Promise<DockScan>; resolve: (scan: DockScan) => void };

  function createDeferredScan(): DeferredScan {
    let resolve!: (scan: DockScan) => void;
    const value = new Promise<DockScan>((resolvePromise) => {
      resolve = resolvePromise;
    });
    return { promise: value, resolve };
  }

  it("waits for an active background scan before starting a dedicated Access Check", async () => {
    const scans: Array<{ sources: readonly StoredSource[]; timeout: number; deferred: DeferredScan }> = [];
    const coordinator = new DockScanCoordinator((sources, timeout) => {
      const deferred = createDeferredScan();
      scans.push({ sources, timeout, deferred });
      return deferred.promise;
    });

    const background = coordinator.background(allRows);
    await vi.waitFor(() => expect(scans).toHaveLength(1));
    const accessCheck = coordinator.accessCheck([slackRow]);
    await Promise.resolve();
    expect(scans).toHaveLength(1);

    scans[0].deferred.resolve({ kind: "success", outcomes: {} });
    await background;
    await vi.waitFor(() => expect(scans).toHaveLength(2));
    expect(scans[1]).toMatchObject({ sources: [slackRow], timeout: 60_000 });

    scans[1].deferred.resolve({ kind: "success", outcomes: {} });
    await expect(accessCheck).resolves.toEqual({ kind: "success", outcomes: {} });
  });

  it("runs a later background refresh after an Access Check so its snapshot can replace the diagnostic snapshot", async () => {
    const scans: Array<{ sources: readonly StoredSource[]; timeout: number; deferred: DeferredScan }> = [];
    const coordinator = new DockScanCoordinator((sources, timeout) => {
      const deferred = createDeferredScan();
      scans.push({ sources, timeout, deferred });
      return deferred.promise;
    });

    const accessCheck = coordinator.accessCheck([slackRow]);
    await vi.waitFor(() => expect(scans).toHaveLength(1));
    const background = coordinator.background([telegramRow]);
    await Promise.resolve();
    expect(scans).toHaveLength(1);

    scans[0].deferred.resolve({ kind: "success", outcomes: { slack: { kind: "badge", badge: "3" } } });
    await accessCheck;
    await vi.waitFor(() => expect(scans).toHaveLength(2));
    expect(scans[1]).toMatchObject({ sources: [telegramRow], timeout: 10_000 });

    scans[1].deferred.resolve({ kind: "success", outcomes: { telegram: { kind: "badge", badge: "4" } } });
    await expect(background).resolves.toEqual({
      kind: "success",
      outcomes: { telegram: { kind: "badge", badge: "4" } },
    });
  });
});

describe("transitionSetupGate", () => {
  it("opens only after a successful explicit diagnostic", () => {
    expect(transitionSetupGate(false, allSources, { kind: "success" })).toBe(true);
  });

  it("clears for permission loss but retains the gate after a transient failure", () => {
    expect(transitionSetupGate(true, allSources, { kind: "accessibilityRequired" })).toBe(false);
    expect(transitionSetupGate(true, allSources, { kind: "automationRequired" })).toBe(false);
    expect(transitionSetupGate(true, allSources, { kind: "failed" })).toBe(true);
  });

  it("does not create or clear the gate when no Sources are enabled", () => {
    expect(transitionSetupGate(false, [], { kind: "success" })).toBe(false);
    expect(transitionSetupGate(true, [], { kind: "accessibilityRequired" })).toBe(true);
  });
});
