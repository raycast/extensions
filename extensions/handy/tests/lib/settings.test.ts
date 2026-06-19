import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { readSettings, writeSettings } from "../../src/lib/settings";

const TMP_DIR = join(tmpdir(), "handy-test-settings");
const TMP_FILE = join(TMP_DIR, "settings_store.json");

function makeStore(custom_words: string[], selected_model: string) {
  return JSON.stringify({
    settings: { custom_words, selected_model, some_other_key: "preserved" },
  });
}

beforeEach(() => { mkdirSync(TMP_DIR, { recursive: true }); });
afterEach(() => { rmSync(TMP_DIR, { recursive: true, force: true }); });

describe("readSettings", () => {
  it("reads custom_words through settings envelope", () => {
    writeFileSync(TMP_FILE, makeStore(["hello", "world"], "small"));
    expect(readSettings(TMP_FILE).custom_words).toEqual(["hello", "world"]);
  });

  it("reads selected_model", () => {
    writeFileSync(TMP_FILE, makeStore([], "moonshine-base"));
    expect(readSettings(TMP_FILE).selected_model).toBe("moonshine-base");
  });

  it("throws if file does not exist", () => {
    expect(() => readSettings("/nonexistent.json")).toThrow();
  });

  it("throws if JSON is malformed", () => {
    writeFileSync(TMP_FILE, "{ bad json }");
    expect(() => readSettings(TMP_FILE)).toThrow();
  });

  it("reads selected_language", () => {
    writeFileSync(TMP_FILE, JSON.stringify({
      settings: { custom_words: [], selected_model: "small", selected_language: "it" }
    }));
    expect(readSettings(TMP_FILE).selected_language).toBe("it");
  });

  it("returns 'auto' when selected_language is missing", () => {
    writeFileSync(TMP_FILE, makeStore([], "small")); // makeStore has no selected_language
    expect(readSettings(TMP_FILE).selected_language).toBe("auto");
  });
});

describe("writeSettings", () => {
  it("updates custom_words without touching other keys", () => {
    writeFileSync(TMP_FILE, makeStore(["old"], "small"));
    writeSettings({ custom_words: ["new1", "new2"] }, TMP_FILE);
    const result = readSettings(TMP_FILE);
    expect(result.custom_words).toEqual(["new1", "new2"]);
    expect(result.selected_model).toBe("small");
    expect((result as Record<string, unknown>)["some_other_key"]).toBe("preserved");
  });

  it("updates selected_model without touching other keys", () => {
    writeFileSync(TMP_FILE, makeStore(["word"], "small"));
    writeSettings({ selected_model: "moonshine-base" }, TMP_FILE);
    const result = readSettings(TMP_FILE);
    expect(result.selected_model).toBe("moonshine-base");
    expect(result.custom_words).toEqual(["word"]);
  });

  it("preserves the settings envelope key on write", () => {
    writeFileSync(TMP_FILE, makeStore([], "small"));
    writeSettings({ selected_model: "turbo" }, TMP_FILE);
    const raw = JSON.parse(readFileSync(TMP_FILE, "utf-8"));
    expect(raw).toHaveProperty("settings");
    expect(raw.settings.selected_model).toBe("turbo");
  });

  it("updates selected_language without touching other keys", () => {
    writeFileSync(TMP_FILE, JSON.stringify({
      settings: { custom_words: ["w"], selected_model: "small", selected_language: "en" }
    }));
    writeSettings({ selected_language: "fr" }, TMP_FILE);
    expect(readSettings(TMP_FILE).selected_language).toBe("fr");
    expect(readSettings(TMP_FILE).selected_model).toBe("small");
  });
});
