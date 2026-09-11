import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { siteUrl } from "../urls";
import type { YerdSite, YerdStatusReport } from "../../yerd/types";

// Inline fixture builders — no shared state, every case constructs its own input.

function makeReport(
  overrides: Partial<YerdStatusReport> = {},
): YerdStatusReport {
  return {
    daemon_pid: 1,
    uptime_secs: 100,
    daemon_rss_bytes: 0,
    tld: "test",
    http: { bound: 80, fell_back: false, requested: 80 },
    https: { bound: 443, fell_back: false, requested: 443 },
    dns_addr: "127.0.0.1:1053",
    ca: {
      path: "",
      fingerprint: "",
      trusted_system: true,
      php_trusts_ca: true,
      browser_trust: "ok",
    },
    resolver_installed: true,
    port_redirect: false,
    foreign_web_listener: false,
    resolver_backup: null,
    default_php: "8.5",
    php: [],
    sites: { linked: 0, parked: 0, secured: 0 },
    load_avg: null,
    daemon_version: "2.0.4",
    services: [],
    mail: { enabled: true, port: 2525, listening: true, count: 0, unread: 0 },
    boot_id: 1,
    symlink_protection: true,
    mcp_enabled: true,
    lan_enabled: false,
    port_redirect_targets: { http: 80, https: 443 },
    ...overrides,
  };
}

function makeSite(overrides: Partial<YerdSite> = {}): YerdSite {
  return {
    name: "myapp",
    document_root: "/tmp/myapp",
    php: "8.5",
    secure: false,
    kind: "parked",
    uses_front_controller: false,
    ...overrides,
  };
}

const FALLBACK_REPORT = makeReport({
  http: { bound: 8080, fell_back: true, requested: 80 },
  https: { bound: 8443, fell_back: true, requested: 443 },
});

describe("siteUrl", () => {
  // Case 1: unsecured on standard ports → no suffix
  it("unsecured on standard port 80 → no port suffix", () => {
    const url = siteUrl(makeSite({ secure: false }), makeReport());
    assert.strictEqual(url, "http://myapp.test");
  });

  // Case 2: secured on standard port 443 → no suffix
  it("secured on standard port 443 → no port suffix", () => {
    const url = siteUrl(makeSite({ secure: true }), makeReport());
    assert.strictEqual(url, "https://myapp.test");
  });

  // Case 3: unsecured on fallback port 8080 → includes port
  it("unsecured on fallback port 8080 → includes port", () => {
    const url = siteUrl(makeSite({ secure: false }), FALLBACK_REPORT);
    assert.strictEqual(url, "http://myapp.test:8080");
  });

  // Case 4: secured on fallback port 8443 → includes port
  it("secured on fallback port 8443 → includes port", () => {
    const url = siteUrl(makeSite({ secure: true }), FALLBACK_REPORT);
    assert.strictEqual(url, "https://myapp.test:8443");
  });

  // Case 5: resolver not installed → localhost fallback regardless of secure
  it("resolver_installed=false → localhost fallback URL", () => {
    const noResolver = makeReport({
      resolver_installed: false,
      http: { bound: 8080, fell_back: true, requested: 80 },
    });
    const url = siteUrl(makeSite({ name: "chirper" }), noResolver);
    assert.strictEqual(url, "http://localhost:8080/~chirper.test");
  });

  // Case 6: resolver not installed, secured site → still localhost fallback
  it("resolver_installed=false + secure site → still localhost fallback", () => {
    const noResolver = makeReport({
      resolver_installed: false,
      http: { bound: 8080, fell_back: true, requested: 80 },
    });
    const url = siteUrl(makeSite({ secure: true }), noResolver);
    assert.strictEqual(url, "http://localhost:8080/~myapp.test");
  });

  // Case 7: TLD is used from status (not hardcoded .test)
  it("uses TLD from report (not hardcoded .test)", () => {
    const customTld = makeReport({ tld: "local" });
    const url = siteUrl(makeSite(), customTld);
    assert.strictEqual(url, "http://myapp.local");
  });

  // Case 8: https.bound = 443 exactly → no suffix (regression guard)
  it("https.bound=443 → no :443 suffix (regression guard)", () => {
    const report = makeReport({
      https: { bound: 443, fell_back: false, requested: 443 },
    });
    const url = siteUrl(makeSite({ secure: true }), report);
    assert.ok(
      !url.includes(":443"),
      `URL must not include :443 but got: ${url}`,
    );
  });

  // Case 9: site name with hyphens
  it("site name with hyphens → preserved in URL", () => {
    const url = siteUrl(makeSite({ name: "my-cool-app" }), makeReport());
    assert.strictEqual(url, "http://my-cool-app.test");
  });
});
