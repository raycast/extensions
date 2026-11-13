import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  FALLBACK_SEARCH_ENGINE,
  findHistoryDatabasePath,
  getCandidateProfileNames,
  getDefaultSearchProviderFromPreferences,
  getDefaultSearchProviderGuid,
  getHeliumSearchEngine,
  getHeliumServicesPreferencesFromJson,
  getSearchEngineQuery,
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

  it("prefers the last used profile over other candidates", () => {
    const root = makeProfileRoot();
    mkdirSync(join(root, "Default"), { recursive: true });
    mkdirSync(join(root, "Profile 2"), { recursive: true });
    writeFileSync(join(root, "Default", "Preferences"), "{}");
    writeFileSync(join(root, "Default", "History"), "");
    writeFileSync(join(root, "Profile 2", "Preferences"), "{}");
    writeFileSync(join(root, "Profile 2", "History"), "");
    writeFileSync(
      join(root, "Local State"),
      JSON.stringify({
        profile: { last_used: "Profile 2", last_active_profiles: ["Default"], info_cache: { Default: {} } },
      }),
    );

    expect(getCandidateProfileNames(root)).toEqual(["Profile 2", "Default"]);
    expect(findHistoryDatabasePath(root)).toBe(join(root, "Profile 2", "History"));
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

  // Shape of a real Helium profile after picking Google in Settings → Search engine:
  // only the GUID and Chromium's mirrored copy of the engine are stored.
  const googleSelectedPreferences = {
    default_search_provider: {
      choice_screen_random_shuffle_seed: "-7250486180369090694",
      guid: "485bf7d3-0215-45af-87dc-538868000001",
      reset_occurred: false,
    },
    default_search_provider_data: {
      mirrored_template_url_data: {
        id: "2",
        short_name: "Google",
        keyword: "google.com",
        url: "https://www.google.com/search?q={searchTerms}",
        suggestions_url: "https://www.google.com/complete/search?client=chrome&q={searchTerms}",
        prepopulate_id: 1,
        synced_guid: "485bf7d3-0215-45af-87dc-538868000001",
      },
    },
  };

  it("reads the selected engine from Chromium's mirrored default search provider data", () => {
    expect(getDefaultSearchProviderFromPreferences(googleSelectedPreferences)).toEqual({
      name: "Google",
      keyword: "google.com",
      searchUrl: "https://www.google.com/search?q={searchTerms}",
      suggestionsUrl: "https://www.google.com/complete/search?client=chrome&q={searchTerms}",
    });
  });

  it("prefers user-chosen template data over the mirrored copy", () => {
    expect(
      getDefaultSearchProviderFromPreferences({
        default_search_provider_data: {
          template_url_data: {
            short_name: "Kagi",
            keyword: "kagi.com",
            url: "https://kagi.com/search?q={searchTerms}",
          },
          mirrored_template_url_data: googleSelectedPreferences.default_search_provider_data.mirrored_template_url_data,
        },
      }),
    ).toMatchObject({ name: "Kagi", searchUrl: "https://kagi.com/search?q={searchTerms}", suggestionsUrl: undefined });
  });

  it("resolves the selected engine from a real-shaped profile without touching Web Data", async () => {
    const root = makeProfileRoot();
    mkdirSync(join(root, "Default"), { recursive: true });
    writeFileSync(join(root, "Default", "Preferences"), JSON.stringify(googleSelectedPreferences));

    await expect(getHeliumSearchEngine(root)).resolves.toMatchObject({ name: "Google", keyword: "google.com" });
  });

  it("extracts only well-formed default search provider GUIDs", () => {
    expect(getDefaultSearchProviderGuid(googleSelectedPreferences)).toBe("485bf7d3-0215-45af-87dc-538868000001");
    expect(getDefaultSearchProviderGuid({ default_search_provider: { guid: "x' OR 1=1 --" } })).toBeUndefined();
    expect(getDefaultSearchProviderGuid({ default_search_provider: {} })).toBeUndefined();
  });

  it("queries Web Data by GUID, or for DuckDuckGo when no engine is selected", () => {
    expect(getSearchEngineQuery("485bf7d3-0215-45af-87dc-538868000001")).toContain(
      "WHERE sync_guid = '485bf7d3-0215-45af-87dc-538868000001'",
    );
    expect(getSearchEngineQuery(undefined)).toContain("prepopulate_id = 92");
  });
});
