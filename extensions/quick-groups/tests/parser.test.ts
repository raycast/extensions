import { describe, expect, it } from "vitest";
import { parseReferenceYaml } from "../src/parser";

describe("parseReferenceYaml", () => {
  it("parses multiple collections and records while preserving field order", () => {
    const result = parseReferenceYaml(
      `
machines:
  dev:
    ip: 192.168.1.20
    model: EQR5
  staging:
    ip: 192.168.1.21
services:
  nominatim:
    port: 8080
`,
      "reference.yaml",
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.records.map((record) => `${record.collection}/${record.name}`)).toEqual([
      "machines/dev",
      "machines/staging",
      "services/nominatim",
    ]);
    expect(result.records[0].fields.map((field) => field.label)).toEqual(["ip", "model"]);
  });

  it("normalizes scalar and annotated fields", () => {
    const { records } = parseReferenceYaml(
      `
machines:
  dev:
    ip: 192.168.1.20
    host:
      ssh: root@192.168.1.46
    proxmox:
      value: 192.168.1.46
      ssh: root@192.168.1.46
      open: https://192.168.1.46:8006
      obsidian: Infrastructure/Proxmox/pve-14
`,
      "machines.yaml",
    );
    const [ip, host, proxmox] = records[0].fields;
    expect(ip.effectiveValue).toBe("192.168.1.20");
    expect(host.effectiveValue).toBe("root@192.168.1.46");
    expect(host.actions).toEqual([{ kind: "ssh", target: "root@192.168.1.46" }]);
    expect(proxmox.effectiveValue).toBe("192.168.1.46");
    expect(proxmox.values).toContain("https://192.168.1.46:8006");
    expect(proxmox.actions.map((action) => action.kind)).toEqual(["ssh", "open", "obsidian"]);
  });

  it("reports malformed records without discarding valid records", () => {
    const result = parseReferenceYaml(
      "machines:\n  bad: nope\n  good:\n    ip: 10.0.0.1\n",
      "mixed.yaml",
    );
    expect(result.records.map((record) => record.name)).toEqual(["good"]);
    expect(result.diagnostics[0]).toMatchObject({ collection: "machines", record: "bad" });
  });

  it("reports a concise YAML reason with line, column, and source context", () => {
    const result = parseReferenceYaml(
      "machines:\n  dev:\n    ip: 10.0.0.1\n   broken: value\n",
      "broken.yaml",
    );
    expect(result.records).toEqual([]);
    expect(result.diagnostics[0]).toMatchObject({ source: "broken.yaml", line: 4, column: 4 });
    expect(result.diagnostics[0].message).not.toContain("\n");
    expect(result.diagnostics[0].snippet).toContain("broken: value");
  });

  it("extracts pwd actions without exposing their targets as searchable values", () => {
    const { records } = parseReferenceYaml(
      `
services:
  router:
    login:
      value: admin
      pwd: highly-secret
    password:
      pwd: another-secret
`,
      "secrets.yaml",
    );
    const [login, password] = records[0].fields;
    expect(login.effectiveValue).toBe("admin");
    expect(login.sensitive).toBe(false);
    expect(login.values).toEqual(["admin"]);
    expect(login.actions).toContainEqual({ kind: "pwd", target: "highly-secret" });
    expect(password.sensitive).toBe(true);
    expect(password.values).toEqual([]);
  });

  it("substitutes sibling values in annotated fields", () => {
    const { records, diagnostics } = parseReferenceYaml(
      `
machines:
  dev:
    ip:
      value: 192.168.1.20
      user: neilb
      ssh: \${user}@\${value}
    proxmox:
      ssh: root@\${value}
      open: https://\${value}:8006
      value: 192.168.1.46
`,
      "templates.yaml",
    );
    expect(diagnostics).toEqual([]);
    const [ip, proxmox] = records[0].fields;
    expect(ip.actions).toContainEqual({ kind: "ssh", target: "neilb@192.168.1.20" });
    expect(proxmox.actions).toEqual([
      { kind: "ssh", target: "root@192.168.1.46" },
      { kind: "open", target: "https://192.168.1.46:8006" },
    ]);
  });

  it("supports recursive references and escapes substitutions with $$", () => {
    const { records } = parseReferenceYaml(
      `
examples:
  demo:
    endpoint:
      host: server.local
      origin: https://\${host}
      value: \${origin}/api
      open: \${value}
      literal: \$\${host}
`,
      "templates.yaml",
    );
    const field = records[0].fields[0];
    expect(field.effectiveValue).toBe("https://server.local/api");
    expect(field.actions[0].target).toBe("https://server.local/api");
    expect(field.values).toContain("${host}");
  });

  it("propagates sensitivity through substitutions", () => {
    const { records } = parseReferenceYaml(
      `
services:
  router:
    credentials:
      value: admin
      pwd: highly-secret
      derived: token-\${pwd}
`,
      "secrets.yaml",
    );
    const field = records[0].fields[0];
    expect(field.values).toEqual(["admin"]);
    expect(field.values).not.toContain("token-highly-secret");
  });

  it("masks an explicit value derived from a sensitive sibling", () => {
    const { records } = parseReferenceYaml(
      `
services:
  router:
    credentials:
      pwd: highly-secret
      value: \${pwd}
`,
      "secrets.yaml",
    );
    const field = records[0].fields[0];
    expect(field.effectiveValue).toBe("highly-secret");
    expect(field.sensitive).toBe(true);
    expect(field.values).toEqual([]);
  });

  it.each([
    ["missing", "open: https://\${host}", "unknown value"],
    ["cycle", "value: \${host}\n      host: \${value}", "substitution cycle"],
  ])("reports %s substitutions as record diagnostics", (_name, fields, message) => {
    const result = parseReferenceYaml(
      `examples:\n  demo:\n    endpoint:\n      ${fields}\n`,
      "invalid-template.yaml",
    );
    expect(result.records).toEqual([]);
    expect(result.diagnostics[0].message).toContain(message);
  });
});
