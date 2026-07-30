import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assertStatusShape,
  assertSitesShape,
  assertPhpShape,
  assertPhpAvailableShape,
  assertServicesShape,
  assertServiceAvailableShape,
  assertProxiesShape,
  assertMailListShape,
  assertToolsShape,
  assertTunnelStatusShape,
  assertLanStatusShape,
  assertDoctorShape,
} from "../validators";

// Inline anonymized fixtures mirroring live `yerd --json` shapes (daemon 2.0.4).

const FAKE_STATUS = {
  type: "status",
  report: {
    daemon_pid: 1234,
    uptime_secs: 100,
    daemon_rss_bytes: 28000256,
    tld: "test",
    http: { requested: 80, bound: 8080, fell_back: true },
    https: { requested: 443, bound: 8443, fell_back: true },
    dns_addr: "127.0.0.1:1053",
    ca: {
      path: "/tmp/ca.cert.pem",
      fingerprint: "abc123",
      trusted_system: true,
      php_trusts_ca: true,
      browser_trust: "tool_missing",
    },
    resolver_installed: true,
    port_redirect: true,
    foreign_web_listener: false,
    resolver_backup: null,
    default_php: "8.5",
    php: [
      {
        version: "8.5",
        installed_patch: "8.5.8",
        state: "running",
        pid: 4321,
        listen: "/tmp/fpm-8.5.sock",
        rss_bytes: 33308672,
        update_available: null,
      },
    ],
    sites: { parked: 2, linked: 0, secured: 1 },
    load_avg: null,
    daemon_version: "2.0.4",
    services: [],
    mail: { enabled: true, port: 2525, listening: true, count: 0, unread: 0 },
    boot_id: 42,
    symlink_protection: true,
    mcp_enabled: true,
    lan_enabled: false,
    port_redirect_targets: { http: 8080, https: 8443 },
  },
};

const FAKE_SITES = {
  type: "sites",
  sites: [
    {
      name: "alpha",
      document_root: "/home/dev/sites/alpha",
      php: "8.5",
      secure: false,
      kind: "parked",
      uses_front_controller: false,
    },
    {
      name: "beta",
      document_root: "/home/dev/sites/beta",
      web_subpath: "public",
      php: "8.4",
      secure: true,
      kind: "linked",
      uses_front_controller: true,
      is_laravel: true,
    },
  ],
};

const FAKE_PHP = {
  type: "php_versions",
  installed: ["8.4", "8.5"],
  default: "8.5",
  settings: { memory_limit: "512M", display_errors: "On" },
};

const FAKE_PHP_AVAILABLE = {
  type: "available_php",
  available: ["8.2", "8.3", "8.4", "8.5"],
  installed: ["8.4", "8.5"],
  legacy: ["7.4", "8.0", "8.1"],
};

const FAKE_SERVICES = {
  type: "services",
  services: [
    {
      service: "redis",
      display_name: "Redis (Valkey)",
      installed_versions: ["9.1.0"],
      selected_version: "9.1.0",
      state: "running",
      pid: 111,
      listen: "127.0.0.1:6379",
      port: 6379,
      enabled: true,
      supports_databases: false,
      type_id: "redis",
    },
    {
      service: "postgres",
      display_name: "PostgreSQL",
      installed_versions: [],
      selected_version: null,
      state: "stopped",
      pid: null,
      listen: null,
      port: 5432,
      enabled: false,
      supports_databases: true,
      type_id: "postgres",
    },
  ],
};

const FAKE_SERVICE_AVAILABLE = {
  type: "available_services",
  services: [
    { service: "redis", available: ["9.1.0"], installed: ["9.1.0"] },
    { service: "postgres", available: ["17.10", "18.4"], installed: [] },
  ],
};

const FAKE_PROXIES = {
  type: "proxies",
  proxies: [{ name: "reverb", target: "http://127.0.0.1:8081", secure: false }],
  rules: [{ site: "alpha", prefix: "/ws", target: "http://127.0.0.1:8082" }],
};

const FAKE_MAIL_LIST = {
  type: "mails",
  mails: [
    {
      id: "000000",
      from: "sender@example.test",
      to: ["inbox@example.test"],
      subject: "Hello",
      date_epoch: 0,
      read: false,
    },
  ],
};

const FAKE_TOOLS = {
  type: "tools",
  tools: [
    {
      id: "composer",
      display_name: "Composer",
      installed: true,
      version: "2.10.2",
      binaries: ["composer"],
    },
  ],
};

const FAKE_TUNNEL = {
  type: "tunnels",
  tunnels: [],
  cloudflared: {
    installed: true,
    version: "2026.7.3",
    source: "managed",
    logged_in: false,
  },
};

const FAKE_LAN = { lan_enabled: false, lan_ip: null, lan_setup_bound: null };

const FAKE_DOCTOR = {
  type: "diagnoses",
  items: [
    {
      code: "resolver_backup_saved",
      severity: "ok",
      title: "Resolver file replaced",
      detail: "A previous resolver file was backed up.",
      remedy: null,
    },
    {
      code: "ca_not_trusted_by_browsers",
      severity: "warn",
      title: "Can't establish browser trust",
      detail: "certutil is missing.",
      remedy: "yerd elevate trust",
    },
  ],
};

describe("assertStatusShape", () => {
  it("accepts valid status", () => {
    assert.doesNotThrow(() => assertStatusShape(FAKE_STATUS));
  });
  it("rejects null", () => {
    assert.throws(() => assertStatusShape(null));
  });
  it("rejects flat report (missing envelope)", () => {
    assert.throws(() =>
      assertStatusShape({
        daemon_version: "2.0.4",
        tld: "test",
        uptime_secs: 1,
      }),
    );
  });
  it("rejects report missing tld", () => {
    assert.throws(() =>
      assertStatusShape({
        type: "status",
        report: { daemon_version: "2.0.4", uptime_secs: 1 },
      }),
    );
  });
});

describe("assertSitesShape", () => {
  it("accepts valid sites", () => {
    assert.doesNotThrow(() => assertSitesShape(FAKE_SITES));
  });
  it("rejects null", () => {
    assert.throws(() => assertSitesShape(null));
  });
  it("rejects bare array (missing envelope)", () => {
    assert.throws(() => assertSitesShape(FAKE_SITES.sites));
  });
  it("rejects site missing document_root", () => {
    assert.throws(() =>
      assertSitesShape({ type: "sites", sites: [{ name: "alpha" }] }),
    );
  });
});

describe("assertPhpShape", () => {
  it("accepts valid php versions", () => {
    assert.doesNotThrow(() => assertPhpShape(FAKE_PHP));
  });
  it("rejects null", () => {
    assert.throws(() => assertPhpShape(null));
  });
  it("rejects missing default", () => {
    assert.throws(() =>
      assertPhpShape({ type: "php_versions", installed: [], settings: {} }),
    );
  });
});

describe("assertPhpAvailableShape", () => {
  it("accepts valid available php", () => {
    assert.doesNotThrow(() => assertPhpAvailableShape(FAKE_PHP_AVAILABLE));
  });
  it("rejects null", () => {
    assert.throws(() => assertPhpAvailableShape(null));
  });
  it("rejects missing available array", () => {
    assert.throws(() =>
      assertPhpAvailableShape({ type: "available_php", installed: [] }),
    );
  });
});

describe("assertServicesShape", () => {
  it("accepts valid services (running and stopped)", () => {
    assert.doesNotThrow(() => assertServicesShape(FAKE_SERVICES));
  });
  it("rejects null", () => {
    assert.throws(() => assertServicesShape(null));
  });
  it("rejects service missing state", () => {
    assert.throws(() =>
      assertServicesShape({
        type: "services",
        services: [{ service: "redis" }],
      }),
    );
  });
});

describe("assertServiceAvailableShape", () => {
  it("accepts valid available services", () => {
    assert.doesNotThrow(() =>
      assertServiceAvailableShape(FAKE_SERVICE_AVAILABLE),
    );
  });
  it("rejects null", () => {
    assert.throws(() => assertServiceAvailableShape(null));
  });
  it("rejects entry missing available array", () => {
    assert.throws(() =>
      assertServiceAvailableShape({
        type: "available_services",
        services: [{ service: "redis" }],
      }),
    );
  });
});

describe("assertProxiesShape", () => {
  it("accepts valid proxies with rules", () => {
    assert.doesNotThrow(() => assertProxiesShape(FAKE_PROXIES));
  });
  it("accepts empty proxies and rules", () => {
    assert.doesNotThrow(() =>
      assertProxiesShape({ type: "proxies", proxies: [], rules: [] }),
    );
  });
  it("rejects null", () => {
    assert.throws(() => assertProxiesShape(null));
  });
  it("rejects missing rules array", () => {
    assert.throws(() => assertProxiesShape({ type: "proxies", proxies: [] }));
  });
});

describe("assertMailListShape", () => {
  it("accepts valid mail list", () => {
    assert.doesNotThrow(() => assertMailListShape(FAKE_MAIL_LIST));
  });
  it("accepts empty mail list", () => {
    assert.doesNotThrow(() =>
      assertMailListShape({ type: "mails", mails: [] }),
    );
  });
  it("rejects null", () => {
    assert.throws(() => assertMailListShape(null));
  });
  it("rejects mail missing id", () => {
    assert.throws(() =>
      assertMailListShape({ type: "mails", mails: [{ subject: "Hi" }] }),
    );
  });
});

describe("assertToolsShape", () => {
  it("accepts valid tools", () => {
    assert.doesNotThrow(() => assertToolsShape(FAKE_TOOLS));
  });
  it("rejects null", () => {
    assert.throws(() => assertToolsShape(null));
  });
  it("rejects tool missing installed flag", () => {
    assert.throws(() =>
      assertToolsShape({ type: "tools", tools: [{ id: "composer" }] }),
    );
  });
});

describe("assertTunnelStatusShape", () => {
  it("accepts valid tunnel status", () => {
    assert.doesNotThrow(() => assertTunnelStatusShape(FAKE_TUNNEL));
  });
  it("rejects null", () => {
    assert.throws(() => assertTunnelStatusShape(null));
  });
  it("rejects missing cloudflared", () => {
    assert.throws(() =>
      assertTunnelStatusShape({ type: "tunnels", tunnels: [] }),
    );
  });
});

describe("assertLanStatusShape", () => {
  it("accepts valid lan status (no type discriminator)", () => {
    assert.doesNotThrow(() => assertLanStatusShape(FAKE_LAN));
  });
  it("rejects null", () => {
    assert.throws(() => assertLanStatusShape(null));
  });
  it("rejects missing lan_ip key", () => {
    assert.throws(() => assertLanStatusShape({ lan_enabled: false }));
  });
});

describe("assertDoctorShape", () => {
  it("accepts valid diagnoses", () => {
    assert.doesNotThrow(() => assertDoctorShape(FAKE_DOCTOR));
  });
  it("accepts empty findings", () => {
    assert.doesNotThrow(() =>
      assertDoctorShape({ type: "diagnoses", items: [] }),
    );
  });
  it("rejects null", () => {
    assert.throws(() => assertDoctorShape(null));
  });
  it("rejects item missing severity", () => {
    assert.throws(() =>
      assertDoctorShape({
        type: "diagnoses",
        items: [{ code: "x", title: "t", detail: "d" }],
      }),
    );
  });
});
