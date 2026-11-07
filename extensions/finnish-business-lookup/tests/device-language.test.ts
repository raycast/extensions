import { expect, mock, test } from "bun:test";
import type { LanguagePreference } from "../src/lib/language";

let preference: LanguagePreference | undefined;
const readDeviceLanguage = mock(() => '(\n    "fi-FI",\n    "en-US"\n)');

// Raycast normally supplies these preferences inside its command process.
mock.module("@raycast/api", () => ({ getPreferenceValues: () => ({ language: preference }) }));
mock.module("node:child_process", () => ({ execFileSync: readDeviceLanguage }));
const { getLanguage } = await import("../src/lib/localization");

test("overrides skip device detection; default detects it once and stays overridable", () => {
  preference = "en";
  expect(getLanguage()).toBe("en");
  preference = "fi";
  expect(getLanguage()).toBe("fi");
  expect(readDeviceLanguage).not.toHaveBeenCalled();

  preference = undefined;
  expect(getLanguage()).toBe("fi");
  expect(readDeviceLanguage).toHaveBeenCalledWith("/usr/bin/defaults", ["read", "-g", "AppleLanguages"], {
    encoding: "utf8",
    timeout: 1000,
    stdio: ["ignore", "pipe", "ignore"],
  });
  preference = "system";
  expect(getLanguage()).toBe("fi");
  expect(readDeviceLanguage).toHaveBeenCalledTimes(1);

  preference = "en";
  expect(getLanguage()).toBe("en");
});
