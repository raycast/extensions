import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, expectTypeOf, it } from "vitest";

import type { TaskViewQuery } from "../application/viewQuery";
import {
  INBOX_COMMAND,
  NEXT_SEVEN_COMMAND,
  SEARCH_COMMAND,
  TODAY_COMMAND,
  resolveSearchCommandConfig,
  type TaskCommandConfig,
} from "../commands/taskCommandConfigs";
import { ProtocolError } from "../domain/errors";
import { buildStableTaskQuery, type StableTaskQueryCapabilities } from "./taskListQueryModel";

const completedCapable: StableTaskQueryCapabilities = { completedQuery: true };
const openOnly: StableTaskQueryCapabilities = { completedQuery: false };

describe("buildStableTaskQuery", () => {
  it.each([
    ["Today", TODAY_COMMAND, "today"],
    ["Next 7 Days", NEXT_SEVEN_COMMAND, "next7Days"],
    ["Inbox", INBOX_COMMAND, "inbox"],
  ] as const)("builds a new open-only %s hydration query for either capability set", (_name, config, view) => {
    for (const capabilities of [completedCapable, openOnly]) {
      const result = buildStableTaskQuery(config, capabilities);

      expect(result).toEqual({ view, status: "open" });
      expect(result).not.toBe(config.query);
    }
  });

  it.each([
    ["base Search", SEARCH_COMMAND],
    ["completed-capable resolved Search", resolveSearchCommandConfig(true)],
    ["open-only resolved Search", resolveSearchCommandConfig(false)],
  ] as const)("derives %s hydration only from runtime capabilities", (_name, config) => {
    const completedHydration = buildStableTaskQuery(config, completedCapable);
    const openHydration = buildStableTaskQuery(config, openOnly);

    expect(completedHydration).toEqual({ view: "search", status: "all" });
    expect(openHydration).toEqual({ view: "search", status: "open" });
    expect(config.defaultStatus).toBe("open");
    expect(config.query.status === "all" || config.query.status === "open").toBe(true);
  });

  it("returns fresh, deeply frozen query values", () => {
    const first = buildStableTaskQuery(SEARCH_COMMAND, completedCapable);
    const second = buildStableTaskQuery(SEARCH_COMMAND, completedCapable);

    expectTypeOf(first).toMatchTypeOf<Readonly<TaskViewQuery>>();
    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(second)).toBe(true);
    expect(Reflect.set(first, "status", "open")).toBe(false);
    expect(first).toEqual({ view: "search", status: "all" });
  });

  it("does not mutate the command config or read its Search status or visible default", () => {
    let queryStatusReads = 0;
    let defaultStatusReads = 0;
    const config = {
      query: {
        view: "search",
        get status() {
          queryStatusReads += 1;
          return "completed";
        },
      },
      placeholder: "Search TickTick…",
      emptyTitle: "No Matching Tasks",
      get defaultStatus() {
        defaultStatusReads += 1;
        return "open";
      },
    } as const;
    expect(buildStableTaskQuery(config as TaskCommandConfig, completedCapable)).toEqual({
      view: "search",
      status: "all",
    });
    expect(queryStatusReads).toBe(0);
    expect(defaultStatusReads).toBe(0);
  });

  it("cannot leak local text, project, selected status, or unknown fields into hydration", () => {
    const injected = {
      ...SEARCH_COMMAND,
      query: {
        view: "search",
        status: "all",
        searchText: "private local search",
        projectId: "private-project",
        selectedStatus: "completed",
        arbitrary: { nested: true },
      },
    } as unknown as TaskCommandConfig;

    const result = buildStableTaskQuery(injected, completedCapable);

    expect(result).toEqual({ view: "search", status: "all" });
    expect(Object.keys(result)).toEqual(["view", "status"]);
    expect(result).not.toHaveProperty("searchText");
    expect(result).not.toHaveProperty("projectId");
    expect(result).not.toHaveProperty("selectedStatus");
    expect(result).not.toHaveProperty("arbitrary");
  });

  it.each([
    ["unknown view", { view: "tomorrow", status: "open" }],
    ["Today with non-open status", { view: "today", status: "all" }],
    ["Next 7 Days with non-open status", { view: "next7Days", status: "completed" }],
    ["Inbox with non-open status", { view: "inbox", status: "all" }],
    ["missing query", undefined],
  ])("rejects a malformed runtime-cast config: %s", (_name, query) => {
    const malformed = {
      placeholder: "private-placeholder",
      emptyTitle: "private-empty-title",
      query,
    } as unknown as TaskCommandConfig;

    expect(() => buildStableTaskQuery(malformed, completedCapable)).toThrowError(
      expect.objectContaining({
        name: "ProtocolError",
        code: "protocol",
        retryable: false,
        message: "The task command configuration is invalid.",
      })
    );
  });

  it("throws a safe ProtocolError without reflecting malformed command content", () => {
    const privateValue = "private-project-and-search-value";
    const malformed = {
      query: { view: privateValue, status: privateValue },
      placeholder: privateValue,
      emptyTitle: privateValue,
    } as unknown as TaskCommandConfig;

    let thrown: unknown;
    try {
      buildStableTaskQuery(malformed, completedCapable);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ProtocolError);
    expect((thrown as Error).message).not.toContain(privateValue);
  });

  it("keeps the production module free of backend, service, persistence, and UI imports", () => {
    const source = readFileSync(resolve(__dirname, "taskListQueryModel.ts"), "utf8");
    const importSpecifiers = Array.from(source.matchAll(/from\s+["']([^"']+)["']/g), (match) => match[1]).sort();

    expect(importSpecifiers).toEqual([
      "../application/viewQuery",
      "../commands/taskCommandConfigs",
      "../domain/errors",
    ]);
    expect(source).not.toMatch(/@raycast|LocalStorage|useTaskQuery|TickTickService|infrastructure\/backend/);
  });
});
