import { describe, expect, it } from "vitest";
import {
  Connections,
  mergeConnections,
  parseConnections,
  serializeConnections,
  withoutConnections,
} from "../src/lib/connections";

describe("parseConnections", () => {
  it("gives an empty set when nothing is stored", () => {
    expect(parseConnections(undefined)).toEqual({});
    expect(parseConnections("")).toEqual({});
  });

  it("gives an empty set for invalid JSON", () => {
    expect(parseConnections("{not json")).toEqual({});
    expect(parseConnections("sk-or-v1-plain-text")).toEqual({});
  });

  it("gives an empty set when the JSON is not an object", () => {
    expect(parseConnections("null")).toEqual({});
    expect(parseConnections("42")).toEqual({});
    expect(parseConnections('"sk-or-v1"')).toEqual({});
    expect(parseConnections('["openrouterApiKey"]')).toEqual({});
  });

  it("keeps the valid fields of a stored set", () => {
    const stored = {
      claudeKeychain: true,
      claudeSessionKey: "sk-ant-sid01-abc",
      cursorCookie: "user_1%3A%3Aeyj",
      openrouterApiKey: "sk-or-v1-xyz",
      zaiApiKey: "z-key",
      zaiRegion: "china",
      kimiApiKey: "kimi-key",
      deepseekApiKey: "sk-deepseek",
      moonshotApiKey: "sk-moonshot",
      moonshotRegion: "global",
    };
    expect(parseConnections(JSON.stringify(stored))).toEqual(stored);
  });

  it("trims strings and drops empty or whitespace-only ones", () => {
    const parsed = parseConnections(
      JSON.stringify({ openrouterApiKey: "  sk-or-v1-x  ", zaiApiKey: "   ", kimiApiKey: "" }),
    );
    expect(parsed).toEqual({ openrouterApiKey: "sk-or-v1-x" });
  });

  it("drops string fields that hold another type", () => {
    const parsed = parseConnections(
      JSON.stringify({
        openrouterApiKey: 12345,
        cursorCookie: ["a"],
        claudeSessionKey: { value: "x" },
        kimiApiKey: null,
      }),
    );
    expect(parsed).toEqual({});
  });

  it("accepts only the two known regions", () => {
    expect(parseConnections(JSON.stringify({ zaiRegion: "china", moonshotRegion: "global" }))).toEqual({
      zaiRegion: "china",
      moonshotRegion: "global",
    });
    expect(parseConnections(JSON.stringify({ zaiRegion: "europe", moonshotRegion: "CHINA" }))).toEqual({});
    expect(parseConnections(JSON.stringify({ zaiRegion: true, moonshotRegion: 1 }))).toEqual({});
  });

  it("keeps the config folders, trimmed, and drops empty ones", () => {
    expect(parseConnections(JSON.stringify({ claudeConfigDir: " /work/claude ", codexHome: "   " }))).toEqual({
      claudeConfigDir: "/work/claude",
    });
  });

  it("counts claudeKeychain only when it is exactly true", () => {
    expect(parseConnections(JSON.stringify({ claudeKeychain: true }))).toEqual({ claudeKeychain: true });
    expect(parseConnections(JSON.stringify({ claudeKeychain: false }))).toEqual({});
    expect(parseConnections(JSON.stringify({ claudeKeychain: "true" }))).toEqual({});
    expect(parseConnections(JSON.stringify({ claudeKeychain: 1 }))).toEqual({});
  });

  it("drops fields that are not connections", () => {
    const parsed = parseConnections(JSON.stringify({ githubToken: "gho_x", openrouterApiKey: "sk-or-v1-x", extra: 1 }));
    expect(parsed).toEqual({ openrouterApiKey: "sk-or-v1-x" });
  });
});

describe("serializeConnections", () => {
  it("writes only the fields that have a value", () => {
    const connections: Connections = { openrouterApiKey: "sk-or-v1-x", cursorCookie: undefined };
    expect(JSON.parse(serializeConnections(connections))).toEqual({ openrouterApiKey: "sk-or-v1-x" });
  });

  it("does not write empty strings or invalid values", () => {
    const dirty = { openrouterApiKey: "  ", zaiRegion: "mars", claudeKeychain: false } as unknown as Connections;
    expect(serializeConnections(dirty)).toBe("{}");
  });

  it("trims what it writes", () => {
    expect(serializeConnections({ kimiApiKey: " kimi-key " })).toBe('{"kimiApiKey":"kimi-key"}');
  });

  it("round-trips through parseConnections", () => {
    const connections: Connections = {
      claudeKeychain: true,
      claudeConfigDir: "/work/claude",
      codexHome: "/work/codex",
      zaiApiKey: "z-key",
      zaiRegion: "china",
      moonshotRegion: "global",
    };
    expect(parseConnections(serializeConnections(connections))).toEqual(connections);
  });
});

describe("mergeConnections", () => {
  it("adds the patch to the stored fields and keeps the rest", () => {
    const merged = mergeConnections(
      { openrouterApiKey: "sk-or-v1-old", cursorCookie: "cookie" },
      {
        openrouterApiKey: "sk-or-v1-new",
      },
    );
    expect(merged).toEqual({ openrouterApiKey: "sk-or-v1-new", cursorCookie: "cookie" });
  });

  it("leaves a field alone when the patch has it as undefined", () => {
    const merged = mergeConnections({ kimiApiKey: "kimi-key" }, { kimiApiKey: undefined, zaiRegion: "china" });
    expect(merged).toEqual({ kimiApiKey: "kimi-key", zaiRegion: "china" });
  });

  it("clears a field when the patch sets it to an empty string or false", () => {
    const merged = mergeConnections(
      { kimiApiKey: "kimi-key", claudeKeychain: true },
      {
        kimiApiKey: "",
        claudeKeychain: false,
      },
    );
    expect(merged).toEqual({});
  });

  it("clears a config folder saved as an empty string, which is how Connect clears one the shell doesn't set", () => {
    const merged = mergeConnections(
      { claudeConfigDir: "/work/claude", codexHome: "/work/codex" },
      { claudeConfigDir: "", codexHome: "/work/new" },
    );
    expect(merged).toEqual({ codexHome: "/work/new" });
  });

  it("does not change the current value it was given", () => {
    const current: Connections = { openrouterApiKey: "sk-or-v1-old" };
    mergeConnections(current, { openrouterApiKey: "sk-or-v1-new" });
    expect(current).toEqual({ openrouterApiKey: "sk-or-v1-old" });
  });
});

describe("withoutConnections", () => {
  it("removes only the listed fields", () => {
    const remaining = withoutConnections({ claudeKeychain: true, openrouterApiKey: "sk-or-v1-x", zaiRegion: "china" }, [
      "openrouterApiKey",
      "zaiRegion",
    ]);
    expect(remaining).toEqual({ claudeKeychain: true });
  });

  it("returns the set unchanged when no listed field is stored", () => {
    expect(withoutConnections({ kimiApiKey: "kimi-key" }, ["cursorCookie"])).toEqual({ kimiApiKey: "kimi-key" });
  });
});
