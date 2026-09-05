import { describe, expect, it } from "vitest";
import { toListBotsResult } from "./list-bots";
import { Bot, parseAgentId } from "../lib/types";

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

const piper = bot({
  id: "a1",
  name: "Piper",
  title: "Engineer",
  description: "Builds things",
  avatarColor: "#fff",
  avatarHash: "abc",
});
const scout = bot({ id: "a2", name: "Scout", isHidden: true, description: "Finds talent" });
const crew = bot({ id: "g1", name: "Launch", isGroup: true });

describe("toListBotsResult", () => {
  it("returns slim rows for every bot when the query is empty, including hidden", () => {
    expect(toListBotsResult([piper, scout, crew])).toEqual([
      {
        id: piper.id,
        name: "Piper",
        title: "Engineer",
        status: { kind: "idle" },
        isGroup: false,
        isHidden: false,
      },
      {
        id: scout.id,
        name: "Scout",
        title: "",
        status: { kind: "idle" },
        isGroup: false,
        isHidden: true,
      },
      {
        id: crew.id,
        name: "Launch",
        title: "",
        status: { kind: "idle" },
        isGroup: true,
        isHidden: false,
      },
    ]);
  });

  it("filters by name or title and still includes hidden matches", () => {
    expect(toListBotsResult([piper, scout, crew], "talent").map((row) => row.name)).toEqual(["Scout"]);
    expect(toListBotsResult([piper, scout, crew], "engine").map((row) => row.name)).toEqual(["Piper"]);
  });
});
