import { describe, expect, it } from "vitest";
import { applyRosterRefresh, isStaleRosterFailure, visibleRoster } from "./roster-refresh";
import { Bot, parseAgentId } from "./types";

function bot(overrides: { id: string; name: string } & Partial<Omit<Bot, "id" | "name">>): Bot {
  const id = parseAgentId(overrides.id);
  if (!id.ok) {
    throw new Error("invalid test id");
  }
  return {
    id: id.value,
    name: overrides.name,
    title: overrides.title ?? "",
    description: overrides.description ?? "",
    isGroup: overrides.isGroup ?? false,
    isHidden: overrides.isHidden ?? false,
    status: overrides.status ?? { kind: "idle" },
    lastPreview: overrides.lastPreview ?? null,
    avatarColor: overrides.avatarColor ?? null,
    avatarHash: overrides.avatarHash ?? null,
  };
}

const piper = bot({ id: "a1", name: "Piper" });
const scout = bot({ id: "a2", name: "Scout" });

describe("applyRosterRefresh", () => {
  it("replaces the roster and clears the error on success", () => {
    expect(
      applyRosterRefresh({
        committed: [piper],
        result: { ok: true, value: [scout] },
      }),
    ).toEqual({ committed: [scout], error: null });
  });

  it("keeps the cached roster and surfaces the error on failure", () => {
    expect(
      applyRosterRefresh({
        committed: [piper],
        result: { ok: false, error: { kind: "unauthorized" } },
      }),
    ).toEqual({ committed: [piper], error: { kind: "unauthorized" } });
  });

  it("surfaces the error when there is no cache", () => {
    expect(
      applyRosterRefresh({
        committed: [],
        result: { ok: false, error: { kind: "unreachable", cause: "offline" } },
      }),
    ).toEqual({ committed: [], error: { kind: "unreachable", cause: "offline" } });
  });
});

describe("visibleRoster", () => {
  it("prefers the committed roster over a draft", () => {
    expect(visibleRoster({ committed: [piper], draft: [scout] })).toEqual([piper]);
  });

  it("uses the draft until a roster is committed", () => {
    expect(visibleRoster({ committed: [], draft: [scout] })).toEqual([scout]);
    expect(visibleRoster({ committed: [], draft: null })).toEqual([]);
  });
});

describe("isStaleRosterFailure", () => {
  it("is true only when a refresh failed and a roster is still on screen", () => {
    expect(isStaleRosterFailure({ error: { kind: "unauthorized" }, committedCount: 1 })).toBe(true);
    expect(isStaleRosterFailure({ error: { kind: "unauthorized" }, committedCount: 0 })).toBe(false);
    expect(isStaleRosterFailure({ error: null, committedCount: 1 })).toBe(false);
  });
});
