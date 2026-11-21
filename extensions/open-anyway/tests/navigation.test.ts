import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { openPrivacySecuritySettings } from "../src/navigation";
import {
  MODERN_SETTINGS_SECURITY_URL,
  LEGACY_PREFERENCES_SECURITY_URL,
  LEGACY_PREFERENCES_FALLBACK_URL,
} from "../src/constants";

describe("openPrivacySecuritySettings", () => {
  it("opens modern settings URL when primary deep link succeeds", async () => {
    const openedUrls: string[] = [];
    const mockOpener = async (url: string) => {
      openedUrls.push(url);
    };

    const result = await openPrivacySecuritySettings({ opener: mockOpener });
    assert.equal(result.success, true);
    assert.equal(result.method, "modern_url");
    assert.equal(result.openedTarget, MODERN_SETTINGS_SECURITY_URL);
    assert.deepEqual(openedUrls, [MODERN_SETTINGS_SECURITY_URL]);
  });

  it("falls back to legacy security URL when modern URL fails", async () => {
    const openedUrls: string[] = [];
    const mockOpener = async (url: string) => {
      openedUrls.push(url);
      if (url === MODERN_SETTINGS_SECURITY_URL) {
        throw new Error("Modern URL not supported");
      }
    };

    const result = await openPrivacySecuritySettings({ opener: mockOpener });
    assert.equal(result.success, true);
    assert.equal(result.method, "legacy_url");
    assert.equal(result.openedTarget, LEGACY_PREFERENCES_SECURITY_URL);
    assert.deepEqual(openedUrls, [MODERN_SETTINGS_SECURITY_URL, LEGACY_PREFERENCES_SECURITY_URL]);
  });

  it("falls back to general security URL when modern and legacy privacy URLs fail", async () => {
    const openedUrls: string[] = [];
    const mockOpener = async (url: string) => {
      openedUrls.push(url);
      if (url === MODERN_SETTINGS_SECURITY_URL || url === LEGACY_PREFERENCES_SECURITY_URL) {
        throw new Error("URL scheme failed");
      }
    };

    const result = await openPrivacySecuritySettings({ opener: mockOpener });
    assert.equal(result.success, true);
    assert.equal(result.method, "legacy_fallback_url");
    assert.equal(result.openedTarget, LEGACY_PREFERENCES_FALLBACK_URL);
  });
});
