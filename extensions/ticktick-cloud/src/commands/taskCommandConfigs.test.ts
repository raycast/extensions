import { describe, expect, expectTypeOf, it } from "vitest";

import type { TaskViewQuery } from "../application/viewQuery";
import {
  INBOX_COMMAND,
  NEXT_SEVEN_COMMAND,
  SEARCH_COMMAND,
  TODAY_COMMAND,
  resolveSearchCommandConfig,
  type TaskCommandConfig,
} from "./taskCommandConfigs";

describe("task command configurations", () => {
  it("defines the exact Today command copy and open query", () => {
    expect(TODAY_COMMAND).toEqual({
      query: { view: "today", status: "open" },
      placeholder: "Search today's tasks…",
      emptyTitle: "No Tasks Today",
    });
  });

  it("uses the plan's ASCII apostrophe and Unicode ellipsis in the Today placeholder", () => {
    expect(Array.from(TODAY_COMMAND.placeholder, (character) => character.codePointAt(0))).toEqual([
      83, 101, 97, 114, 99, 104, 32, 116, 111, 100, 97, 121, 39, 115, 32, 116, 97, 115, 107, 115, 8230,
    ]);
  });

  it("defines the exact Next 7 Days command copy and open query", () => {
    expect(NEXT_SEVEN_COMMAND).toEqual({
      query: { view: "next7Days", status: "open" },
      placeholder: "Search the next 7 days…",
      emptyTitle: "No Upcoming Tasks",
    });
  });

  it("defines the exact Inbox command copy and open query", () => {
    expect(INBOX_COMMAND).toEqual({
      query: { view: "inbox", status: "open" },
      placeholder: "Search Inbox…",
      emptyTitle: "Inbox Is Empty",
    });
  });

  it("defines Search against a stable all-status remote snapshot", () => {
    expect(SEARCH_COMMAND).toEqual({
      query: { view: "search", status: "all" },
      placeholder: "Search TickTick…",
      emptyTitle: "No Matching Tasks",
      defaultStatus: "open",
    });
  });

  it("keeps the public contract and nested queries readonly", () => {
    expectTypeOf(TODAY_COMMAND).toMatchTypeOf<TaskCommandConfig>();
    expectTypeOf(TODAY_COMMAND.query).toMatchTypeOf<Readonly<TaskViewQuery>>();

    expect(Object.isFrozen(TODAY_COMMAND)).toBe(true);
    expect(Object.isFrozen(TODAY_COMMAND.query)).toBe(true);
    expect(Object.isFrozen(NEXT_SEVEN_COMMAND)).toBe(true);
    expect(Object.isFrozen(NEXT_SEVEN_COMMAND.query)).toBe(true);
    expect(Object.isFrozen(INBOX_COMMAND)).toBe(true);
    expect(Object.isFrozen(INBOX_COMMAND.query)).toBe(true);
    expect(Object.isFrozen(SEARCH_COMMAND)).toBe(true);
    expect(Object.isFrozen(SEARCH_COMMAND.query)).toBe(true);
  });

  it("rejects runtime attempts to mutate a command or its nested query", () => {
    expect(Reflect.set(TODAY_COMMAND, "emptyTitle", "Changed")).toBe(false);
    expect(Reflect.set(TODAY_COMMAND.query, "status", "all")).toBe(false);

    expect(TODAY_COMMAND.emptyTitle).toBe("No Tasks Today");
    expect(TODAY_COMMAND.query).toEqual({ view: "today", status: "open" });
  });
});

describe("resolveSearchCommandConfig", () => {
  it("returns all status choices and a fresh all-status query when completed queries are supported", () => {
    const resolved = resolveSearchCommandConfig(true);

    expect(resolved).toEqual({
      query: { view: "search", status: "all" },
      placeholder: "Search TickTick…",
      emptyTitle: "No Matching Tasks",
      defaultStatus: "open",
      statusChoices: ["open", "completed", "all"],
    });
    expect(resolved.query).not.toBe(SEARCH_COMMAND.query);
  });

  it("returns a fresh open-only query and only the Open status choice when completed queries are unsupported", () => {
    const resolved = resolveSearchCommandConfig(false);

    expect(resolved).toEqual({
      query: { view: "search", status: "open" },
      placeholder: "Search TickTick…",
      emptyTitle: "No Matching Tasks",
      defaultStatus: "open",
      statusChoices: ["open"],
    });
    expect(resolved.query).not.toBe(SEARCH_COMMAND.query);
  });

  it("is pure and never mutates or aliases the Search constant", () => {
    const first = resolveSearchCommandConfig(false);
    const second = resolveSearchCommandConfig(false);

    expect(first).not.toBe(second);
    expect(first.query).not.toBe(second.query);
    expect(first.statusChoices).not.toBe(second.statusChoices);
    expect(SEARCH_COMMAND).toEqual({
      query: { view: "search", status: "all" },
      placeholder: "Search TickTick…",
      emptyTitle: "No Matching Tasks",
      defaultStatus: "open",
    });
  });

  it("keeps the consumer-visible default Open independently of the hydration query status", () => {
    const completedCapable = resolveSearchCommandConfig(true);
    const openOnly = resolveSearchCommandConfig(false);

    expect(completedCapable.query.status).toBe("all");
    expect(completedCapable.defaultStatus).toBe("open");
    expect(openOnly.query.status).toBe("open");
    expect(openOnly.defaultStatus).toBe("open");
  });

  it("returns deeply immutable resolved values", () => {
    const resolved = resolveSearchCommandConfig(true);

    expect(Object.isFrozen(resolved)).toBe(true);
    expect(Object.isFrozen(resolved.query)).toBe(true);
    expect(Object.isFrozen(resolved.statusChoices)).toBe(true);
    expect(Reflect.set(resolved.query, "status", "open")).toBe(false);
    expect(Reflect.set(resolved.statusChoices, "0", "all")).toBe(false);
    expect(resolved.query.status).toBe("all");
    expect(resolved.statusChoices).toEqual(["open", "completed", "all"]);
  });
});
