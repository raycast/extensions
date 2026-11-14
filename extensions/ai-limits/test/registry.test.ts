import { describe, expect, it } from "vitest";
import { ConnectMethod } from "../src/lib/connect";
import { Connections } from "../src/lib/connections";
import { PROVIDERS } from "../src/lib/providers";
import { CREATE_KEY_URL as DEEPSEEK_CREATE_KEY_URL } from "../src/lib/providers/deepseek";
import { CREATE_KEY_URL as KIMI_CREATE_KEY_URL } from "../src/lib/providers/kimi";
import { CREATE_KEY_URL as MOONSHOT_CREATE_KEY_URL } from "../src/lib/providers/moonshot";
import { CREATE_KEY_URL as ZAI_CREATE_KEY_URL } from "../src/lib/providers/zai";
import { ProviderError, ProviderId, Settings } from "../src/lib/types";
import { fakeDeps } from "./fake-deps";

// A fresh install has no credentials, so every provider must say "not connected" without a request. This guards the
// promise that a new user sees the Not Connected section, not errors.

const ALL_PROVIDER_IDS: ProviderId[] = [
  "claude",
  "codex",
  "cursor",
  "gemini",
  "copilot",
  "openrouter",
  "zai",
  "kimi",
  "deepseek",
  "moonshot",
];

const EMPTY_SETTINGS: Settings = {};

const CONNECT_KINDS: ConnectMethod["kind"][] = [
  "claude",
  "codex",
  "gemini",
  "cursor",
  "github",
  "openrouter",
  "api-key",
];

// Every field of Connections. Typed as a full record, so a new Connections field fails to compile until it is listed here.
const CONNECTION_KEYS: Record<keyof Connections, true> = {
  claudeKeychain: true,
  claudeConfigDir: true,
  codexHome: true,
  claudeSessionKey: true,
  cursorCookie: true,
  openrouterApiKey: true,
  zaiApiKey: true,
  zaiRegion: true,
  kimiApiKey: true,
  deepseekApiKey: true,
  moonshotApiKey: true,
  moonshotRegion: true,
};

describe("provider connect methods", () => {
  it("gives every provider a Connect method", () => {
    for (const provider of PROVIDERS) {
      expect(CONNECT_KINDS).toContain(provider.connect.kind);
    }
  });

  it("gives every API-key method an https link to the key page", () => {
    for (const provider of PROVIDERS) {
      if (provider.connect.kind === "api-key") {
        expect(provider.connect.keyUrl).toMatch(/^https:\/\//);
      }
    }
  });

  it("links each API-key method to the key page its provider module uses", () => {
    // The registry takes these from the provider modules, so the Connect link and the hint in the error stay the same.
    const keyPages: Record<string, string> = {
      zai: ZAI_CREATE_KEY_URL,
      kimi: KIMI_CREATE_KEY_URL,
      deepseek: DEEPSEEK_CREATE_KEY_URL,
      moonshot: MOONSHOT_CREATE_KEY_URL,
    };
    expect(ZAI_CREATE_KEY_URL).toBe("https://z.ai/manage-apikey/apikey-list");
    for (const provider of PROVIDERS) {
      if (provider.connect.kind === "api-key") {
        expect(provider.connect.keyUrl).toBe(keyPages[provider.id]);
      }
    }
  });

  it("only forgets connections the extension stores", () => {
    const stored = Object.keys(CONNECTION_KEYS);
    for (const provider of PROVIDERS) {
      for (const key of provider.forget) {
        expect(stored).toContain(key);
      }
    }
  });
});

describe("provider registry", () => {
  it("has a unique id for every provider", () => {
    const ids = PROVIDERS.map((provider) => provider.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers exactly the ProviderId values", () => {
    const ids = PROVIDERS.map((provider) => provider.id).sort();
    expect(ids).toEqual([...ALL_PROVIDER_IDS].sort());
  });

  it("has a name, dashboard and icon for every provider", () => {
    for (const provider of PROVIDERS) {
      expect(provider.name.trim()).not.toBe("");
      expect(provider.dashboardUrl).toMatch(/^https:\/\//);
      expect(provider.iconUrl).toMatch(/^https:\/\//);
    }
  });
});

describe.each(PROVIDERS.map((provider) => [provider.name, provider] as const))(
  "%s with no credentials",
  (_name, provider) => {
    it("rejects with a not-connected error", async () => {
      const deps = fakeDeps();
      const error = await provider.fetchUsage(deps, EMPTY_SETTINGS).then(
        () => undefined,
        (reason: unknown) => reason,
      );
      expect(error).toBeInstanceOf(ProviderError);
      expect((error as ProviderError).kind).toBe("not-connected");
    });

    it("makes no network request", async () => {
      const deps = fakeDeps();
      await provider.fetchUsage(deps, EMPTY_SETTINGS).catch(() => undefined);
      expect(deps.requests).toEqual([]);
    });

    it("gives steps to connect in the hint", async () => {
      const deps = fakeDeps();
      const error = (await provider
        .fetchUsage(deps, EMPTY_SETTINGS)
        .catch((reason: unknown) => reason)) as ProviderError;
      expect(error.hint?.trim()).toBeTruthy();
    });
  },
);
