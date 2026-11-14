import { beforeEach, describe, expect, test } from "bun:test";
import manifest from "../../../package.json";
import { DEFAULT_LANGUAGE, LANGUAGES } from "../../core/languages";
import { createProvider, saveProvider, setProviderFallback } from "../../core/provider-settings";
import { loadSettings } from "../settings";
import { localStore } from "../storage";
import { raycast } from "./test-helpers";

describe("loadSettings", () => {
  beforeEach(() => raycast.reset());

  test("starts without providers and with default general preferences", async () => {
    expect(await loadSettings()).toEqual({
      providers: [],
      defaultTone: "default",
      primaryAction: "paste",
      target: { kind: "pair", main: DEFAULT_LANGUAGE, second: { code: "id", name: "Indonesian" } },
    });
  });

  test("loads managed providers instead of old credential preferences", async () => {
    raycast.preferences = { groqApiKey: "legacy-key" };
    expect((await loadSettings()).providers).toEqual([]);
    await saveProvider(
      localStore,
      createProvider({
        id: "gemini",
        apiKey: "managed-key",
        model: "chosen",
        baseUrl: "",
        enabled: true,
      }),
    );
    await saveProvider(
      localStore,
      createProvider({ id: "groq", apiKey: "other-key", model: "", baseUrl: "", enabled: true }),
    );
    expect((await loadSettings()).providers.map(({ id }) => id)).toEqual(["gemini"]);
    await setProviderFallback(localStore, true);
    expect((await loadSettings()).providers.map(({ id }) => id)).toEqual(["gemini", "groq"]);
  });

  test("uses the chosen tone and language pair", async () => {
    raycast.preferences = { defaultTone: "linkedin", mainLanguage: "ja", secondLanguage: "en" };
    expect(await loadSettings()).toMatchObject({
      defaultTone: "linkedin",
      target: { kind: "pair", main: { code: "ja", name: "Japanese" }, second: DEFAULT_LANGUAGE },
    });
  });

  test("translates into one fixed language when both languages match", async () => {
    raycast.preferences = { mainLanguage: "ja", secondLanguage: "ja" };
    expect((await loadSettings()).target).toEqual({
      kind: "fixed",
      language: { code: "ja", name: "Japanese" },
    });
  });

  test("uses copy as the primary action when chosen", async () => {
    raycast.preferences = { primaryAction: "copy" };
    expect((await loadSettings()).primaryAction).toBe("copy");
  });

  test("keeps only general preferences in the manifest", () => {
    expect(manifest.preferences.map(({ name }) => name)).toEqual([
      "mainLanguage",
      "secondLanguage",
      "defaultTone",
      "primaryAction",
    ]);
    expect(manifest.commands.some(({ name }) => name === "manage-providers")).toBe(true);
  });

  test("offers every language in both language preferences", () => {
    for (const name of ["mainLanguage", "secondLanguage"]) {
      const preference = manifest.preferences.find((entry) => entry.name === name);
      expect(preference?.data?.map((option) => option.value)).toEqual(
        LANGUAGES.map(({ code }) => code),
      );
    }
  });
});
