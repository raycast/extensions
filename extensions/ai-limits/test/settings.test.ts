import { describe, expect, it } from "vitest";
import { Connections } from "../src/lib/connections";
import { startRegion, toSettings } from "../src/lib/settings";

function prefs(overrides: Partial<Record<string, string>> = {}): Preferences {
  return {
    displayMode: "used",
    showNotConnected: true,
    zaiRegion: "global",
    moonshotRegion: "global",
    ...overrides,
  } as Preferences;
}

describe("startRegion", () => {
  it("starts a key form on the region the provider already has", () => {
    expect(startRegion({ zaiRegion: "china" }, "zaiRegion")).toBe("china");
    expect(startRegion({ moonshotRegion: "china" }, "moonshotRegion")).toBe("china");
  });

  it("starts on global when the provider has no region saved", () => {
    expect(startRegion({ zaiApiKey: "key" }, "zaiRegion")).toBe("global");
  });

  it("starts on global when the key form has no region field", () => {
    expect(startRegion({ zaiRegion: "china" }, undefined)).toBe("global");
  });
});

describe("toSettings", () => {
  it("trims the strings it keeps", () => {
    const settings = toSettings(prefs({ claudeSessionKey: "  sk-ant-sid01-abc  ", openrouterApiKey: " sk-or-v1-x " }));
    expect(settings.claudeSessionKey).toBe("sk-ant-sid01-abc");
    expect(settings.openrouterApiKey).toBe("sk-or-v1-x");
  });

  it("turns empty and whitespace-only strings into undefined", () => {
    const settings = toSettings(prefs({ cursorCookie: "", githubToken: "   ", kimiApiKey: "" }));
    expect(settings.cursorCookie).toBeUndefined();
    expect(settings.githubToken).toBeUndefined();
    expect(settings.kimiApiKey).toBeUndefined();
  });

  it("leaves a missing preference undefined", () => {
    expect(toSettings(prefs()).zaiApiKey).toBeUndefined();
  });

  it("passes the regions through", () => {
    const settings = toSettings(prefs({ zaiRegion: "china", moonshotRegion: "china" }));
    expect(settings.zaiRegion).toBe("china");
    expect(settings.moonshotRegion).toBe("china");
  });

  it("keeps the GitHub sign-in token apart from the preference token", () => {
    const settings = toSettings(prefs({ githubToken: "" }), {}, "gho_signedin");
    expect(settings.githubToken).toBeUndefined();
    expect(settings.githubOAuthToken).toBe("gho_signedin");
  });

  it("treats an empty sign-in token as absent", () => {
    expect(toSettings(prefs(), {}, "  ").githubOAuthToken).toBeUndefined();
  });

  describe("credential sources", () => {
    it.each([
      ["claudeSessionKey", "claudeSessionKeySource"],
      ["cursorCookie", "cursorCookieSource"],
      ["openrouterApiKey", "openrouterApiKeySource"],
      ["zaiApiKey", "zaiApiKeySource"],
      ["kimiApiKey", "kimiApiKeySource"],
      ["deepseekApiKey", "deepseekApiKeySource"],
      ["moonshotApiKey", "moonshotApiKeySource"],
    ] as const)("records where %s came from, so hints can name the right fix", (value, source) => {
      expect(toSettings(prefs({ [value]: "typed" }), { [value]: "stored" } as Connections)[source]).toBe("preference");
      expect(toSettings(prefs({ [value]: "  " }), { [value]: "stored" } as Connections)[source]).toBe("connection");
      expect(toSettings(prefs(), { [value]: "  " } as Connections)[source]).toBeUndefined();
    });

    it("leaves the source unset when the value is set nowhere", () => {
      const settings = toSettings(prefs());

      expect(settings.claudeSessionKeySource).toBeUndefined();
      expect(settings.cursorCookieSource).toBeUndefined();
      expect(settings.openrouterApiKeySource).toBeUndefined();
    });

    it("keeps the value and its source from the same place, so a preference never reads as a saved connection", () => {
      const settings = toSettings(prefs({ cursorCookie: "cookie-typed" }), { cursorCookie: "cookie-stored" });

      expect(settings.cursorCookie).toBe("cookie-typed");
      expect(settings.cursorCookieSource).toBe("preference");
    });
  });

  describe("with stored connections", () => {
    it("passes the config folders the user's shell set through from the connections only", () => {
      const settings = toSettings(prefs(), { claudeConfigDir: "/work/claude", codexHome: "/work/codex" });
      expect(settings.claudeConfigDir).toBe("/work/claude");
      expect(settings.codexHome).toBe("/work/codex");
      expect(toSettings(prefs()).codexHome).toBeUndefined();
    });

    it("uses a stored connection when the preference is empty", () => {
      const connections: Connections = { openrouterApiKey: "sk-or-v1-stored", cursorCookie: "cookie-stored" };
      const settings = toSettings(prefs({ openrouterApiKey: "", cursorCookie: "  " }), connections);
      expect(settings.openrouterApiKey).toBe("sk-or-v1-stored");
      expect(settings.cursorCookie).toBe("cookie-stored");
    });

    it("lets a non-empty preference win over the stored connection", () => {
      const connections: Connections = { openrouterApiKey: "sk-or-v1-stored", claudeSessionKey: "sk-ant-stored" };
      const settings = toSettings(
        prefs({ openrouterApiKey: " sk-or-v1-typed ", claudeSessionKey: "sk-ant-typed" }),
        connections,
      );
      expect(settings.openrouterApiKey).toBe("sk-or-v1-typed");
      expect(settings.claudeSessionKey).toBe("sk-ant-typed");
    });

    it("uses the stored key when the preference is missing altogether", () => {
      const settings = toSettings(prefs(), { kimiApiKey: "  kimi-stored  " });
      expect(settings.kimiApiKey).toBe("kimi-stored");
    });

    it("passes the Claude Keychain choice through from the connections only", () => {
      expect(toSettings(prefs(), { claudeKeychain: true }).claudeKeychain).toBe(true);
      expect(toSettings(prefs()).claudeKeychain).toBeUndefined();
    });

    it("uses the stored z.ai region when the z.ai key came from the connection", () => {
      const settings = toSettings(prefs({ zaiRegion: "global" }), { zaiApiKey: "z-stored", zaiRegion: "china" });
      expect(settings.zaiApiKey).toBe("z-stored");
      expect(settings.zaiRegion).toBe("china");
    });

    it("defaults the z.ai region to global for a connected key with no stored region", () => {
      const settings = toSettings(prefs({ zaiRegion: "china" }), { zaiApiKey: "z-stored" });
      expect(settings.zaiRegion).toBe("global");
    });

    it("uses the preference z.ai region when the z.ai key came from the preferences", () => {
      const settings = toSettings(prefs({ zaiApiKey: "z-typed", zaiRegion: "china" }), { zaiRegion: "global" });
      expect(settings.zaiApiKey).toBe("z-typed");
      expect(settings.zaiRegion).toBe("china");
    });

    it("keeps the preference z.ai region when there is no z.ai key at all", () => {
      expect(toSettings(prefs({ zaiRegion: "china" })).zaiRegion).toBe("china");
    });

    it("uses the stored Moonshot region when the Moonshot key came from the connection", () => {
      const settings = toSettings(prefs({ moonshotRegion: "global" }), {
        moonshotApiKey: "m-stored",
        moonshotRegion: "china",
      });
      expect(settings.moonshotApiKey).toBe("m-stored");
      expect(settings.moonshotRegion).toBe("china");
    });

    it("uses the preference Moonshot region when the Moonshot key came from the preferences", () => {
      const settings = toSettings(prefs({ moonshotApiKey: "m-typed", moonshotRegion: "china" }), {
        moonshotApiKey: "m-stored",
        moonshotRegion: "global",
      });
      expect(settings.moonshotApiKey).toBe("m-typed");
      expect(settings.moonshotRegion).toBe("china");
    });

    it("keeps the preference region when no z.ai key is set, even if a region is stored", () => {
      const settings = toSettings(prefs({ zaiApiKey: "   ", zaiRegion: "global" }), { zaiRegion: "china" });
      expect(settings.zaiApiKey).toBeUndefined();
      expect(settings.zaiRegion).toBe("global");
    });
  });
});
