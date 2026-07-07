import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  FALLBACK_SEARCH_ENGINE,
  findHistoryDatabasePath,
  getCandidateProfileNames,
  getDefaultSearchProviderFromPreferences,
  getHeliumServicesPreferencesFromJson,
} from "../../src/utils/helium-profile";

let tempDir: string | undefined;

function makeProfileRoot() {
  tempDir = mkdtempSync(join(tmpdir(), "helium-profile-test-"));
  return tempDir;
}

afterEach(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  tempDir = undefined;
});

describe("Helium profile helpers", () => {
  it("discovers profile names from Local State and profile directories", () => {
    const root = makeProfileRoot();
    mkdirSync(join(root, "Default"), { recursive: true });
    mkdirSync(join(root, "Profile 2"), { recursive: true });
    writeFileSync(join(root, "Default", "Preferences"), "{}");
    writeFileSync(join(root, "Profile 2", "Preferences"), "{}");
    writeFileSync(
      join(root, "Local State"),
      JSON.stringify({
        profile: { last_active_profiles: ["Profile 2"], info_cache: { Default: {}, "Profile 3": {} } },
      }),
    );

    expect(getCandidateProfileNames(root)).toEqual(["Profile 2", "Default", "Profile 3"]);
  });

  it("finds history database in an active profile", () => {
    const root = makeProfileRoot();
    mkdirSync(join(root, "Profile 2"), { recursive: true });
    writeFileSync(join(root, "Profile 2", "Preferences"), "{}");
    writeFileSync(join(root, "Profile 2", "History"), "");
    writeFileSync(join(root, "Local State"), JSON.stringify({ profile: { last_active_profiles: ["Profile 2"] } }));

    expect(findHistoryDatabasePath(root)).toBe(join(root, "Profile 2", "History"));
  });

  it("reads Helium service preferences with safe defaults", () => {
    expect(getHeliumServicesPreferencesFromJson({})).toEqual({
      enabled: true,
      bangs: true,
      origin: "https://services.helium.imput.net",
    });
    expect(
      getHeliumServicesPreferencesFromJson({
        helium: { services: { enabled: false, bangs: false, origin_override: "http://evil.example" } },
      }),
    ).toEqual({ enabled: false, bangs: false, origin: "https://services.helium.imput.net" });
  });

  it("extracts explicit default search provider data", () => {
    expect(
      getDefaultSearchProviderFromPreferences({
        default_search_provider: {
          short_name: "Kagi",
          keyword: "kagi.com",
          search_url: "https://kagi.com/search?q={searchTerms}",
          suggest_url: "https://kagisuggest.com/api/autosuggest?q={searchTerms}",
        },
      }),
    ).toEqual({
      name: "Kagi",
      keyword: "kagi.com",
      searchUrl: "https://kagi.com/search?q={searchTerms}",
      suggestionsUrl: "https://kagisuggest.com/api/autosuggest?q={searchTerms}",
    });
  });

  it("ignores incomplete default search provider data", () => {
    expect(
      getDefaultSearchProviderFromPreferences({ default_search_provider: { choice_screen_random_shuffle_seed: "1" } }),
    ).toBeUndefined();
    expect(FALLBACK_SEARCH_ENGINE.name).toBe("DuckDuckGo");
  });
});
