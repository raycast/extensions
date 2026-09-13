import { describe, expect, it } from "vitest";
import {
  ValidationError,
  credentialsInvalidatedBy,
  instanceHost,
  normalizeBaseUrl,
  parseInstances,
  removeInstance,
  serializeInstances,
  upsertInstance,
  validateInstance,
  type ArgoInstance,
  type InstanceDraft,
} from "../../../src/lib/config/instances";

const newId = () => "generated-id";

function instance(overrides: Partial<ArgoInstance> = {}): ArgoInstance {
  return {
    id: "i1",
    name: "dev",
    baseUrl: "https://argocd.example.com",
    env: "dev",
    authMode: "cli",
    allowWrite: true,
    enabled: true,
    ...overrides,
  };
}

function draft(overrides: Partial<InstanceDraft> = {}): InstanceDraft {
  return {
    name: "dev",
    baseUrl: "https://argocd.example.com",
    env: "dev",
    authMode: "cli",
    ...overrides,
  };
}

describe("normalizeBaseUrl", () => {
  it("trims whitespace and the trailing slash", () => {
    expect(normalizeBaseUrl(" https://argocd.example.com/ ")).toBe("https://argocd.example.com");
  });

  it("preserves a base path without its trailing slash", () => {
    expect(normalizeBaseUrl("https://gateway.example.com/argocd/")).toBe("https://gateway.example.com/argocd");
  });

  it("prepends https when the scheme is missing", () => {
    expect(normalizeBaseUrl("argocd.example.com")).toBe("https://argocd.example.com");
  });

  it("keeps a non-default port", () => {
    expect(normalizeBaseUrl("https://argocd.example.com:8443")).toBe("https://argocd.example.com:8443");
  });

  it("rejects plaintext http", () => {
    expect(() => normalizeBaseUrl("http://argocd.example.com")).toThrowError(ValidationError);
    try {
      normalizeBaseUrl("http://argocd.example.com");
    } catch (error) {
      expect((error as ValidationError).field).toBe("baseUrl");
    }
  });

  it("rejects a value that is not a URL", () => {
    expect(() => normalizeBaseUrl("not a url")).toThrowError(ValidationError);
    expect(() => normalizeBaseUrl("")).toThrowError(ValidationError);
  });
});

describe("instanceHost", () => {
  it("returns the bare host", () => {
    expect(instanceHost({ baseUrl: "https://argocd.example.com" })).toBe("argocd.example.com");
  });

  it("keeps a non-default port", () => {
    expect(instanceHost({ baseUrl: "https://argocd.example.com:8443" })).toBe("argocd.example.com:8443");
  });
});

describe("validateInstance", () => {
  it("rejects an empty name", () => {
    expect(() => validateInstance(draft({ name: "  " }), [], newId)).toThrowError(/name/i);
  });

  it("rejects a name already used by another instance, ignoring case", () => {
    const existing = [instance({ id: "other", name: "Dev" })];
    expect(() => validateInstance(draft({ name: "dev" }), existing, newId)).toThrowError(ValidationError);
  });

  it("rejects a base URL already used by another instance", () => {
    const existing = [instance({ id: "other", name: "other", baseUrl: "https://argocd.example.com" })];
    expect(() => validateInstance(draft({ name: "dev" }), existing, newId)).toThrowError(ValidationError);
  });

  it("allows editing an instance without renaming it", () => {
    const existing = [instance({ id: "i1", name: "dev" })];
    const result = validateInstance(draft({ id: "i1", name: "dev" }), existing, newId);
    expect(result.id).toBe("i1");
  });

  it("generates an id when the draft has none", () => {
    expect(validateInstance(draft(), [], newId).id).toBe("generated-id");
  });

  it("forces allowWrite to false on a production instance", () => {
    const result = validateInstance(draft({ env: "prod", allowWrite: true }), [], newId);
    expect(result.allowWrite).toBe(false);
  });

  it("honours allowWrite outside production", () => {
    expect(validateInstance(draft({ env: "dev", allowWrite: true }), [], newId).allowWrite).toBe(true);
    expect(validateInstance(draft({ env: "preprod", allowWrite: true }), [], newId).allowWrite).toBe(true);
    expect(validateInstance(draft({ env: "dev" }), [], newId).allowWrite).toBe(false);
  });

  it("defaults enabled to true", () => {
    expect(validateInstance(draft(), [], newId).enabled).toBe(true);
    expect(validateInstance(draft({ enabled: false }), [], newId).enabled).toBe(false);
  });

  it("normalizes the base URL", () => {
    expect(validateInstance(draft({ baseUrl: "argocd.example.com/" }), [], newId).baseUrl).toBe(
      "https://argocd.example.com",
    );
  });
});

describe("upsertInstance", () => {
  it("appends an unknown instance", () => {
    const result = upsertInstance([instance({ id: "a", name: "a" })], instance({ id: "b", name: "b" }));
    expect(result.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("replaces by id and preserves order", () => {
    const list = [instance({ id: "a", name: "a" }), instance({ id: "b", name: "b" })];
    const result = upsertInstance(list, instance({ id: "a", name: "renamed" }));
    expect(result.map((i) => i.name)).toEqual(["renamed", "b"]);
  });

  it("does not mutate the input", () => {
    const list = [instance({ id: "a", name: "a" })];
    upsertInstance(list, instance({ id: "b", name: "b" }));
    expect(list).toHaveLength(1);
  });
});

describe("removeInstance", () => {
  it("removes by id", () => {
    const list = [instance({ id: "a", name: "a" }), instance({ id: "b", name: "b" })];
    expect(removeInstance(list, "a").map((i) => i.id)).toEqual(["b"]);
  });

  it("is a no-op for an unknown id", () => {
    const list = [instance({ id: "a", name: "a" })];
    expect(removeInstance(list, "zzz")).toEqual(list);
  });
});

describe("parseInstances", () => {
  it("returns an empty list for absent or empty storage", () => {
    expect(parseInstances(undefined)).toEqual([]);
    expect(parseInstances("[]")).toEqual([]);
  });

  it("returns an empty list for malformed JSON", () => {
    expect(parseInstances("{bad json")).toEqual([]);
    expect(parseInstances('{"not":"an array"}')).toEqual([]);
  });

  it("drops structurally invalid entries and keeps the valid ones", () => {
    const raw = JSON.stringify([
      instance({ id: "good", name: "good" }),
      { id: "bad", name: 42 },
      { name: "no-id", baseUrl: "https://argocd.example.com" },
      null,
    ]);
    const result = parseInstances(raw);
    expect(result.map((i) => i.id)).toEqual(["good"]);
  });

  it("repairs missing booleans with safe defaults", () => {
    const raw = JSON.stringify([
      { id: "x", name: "x", baseUrl: "https://argocd.example.com", env: "prod", authMode: "cli" },
    ]);
    const result = parseInstances(raw);
    expect(result[0]).toMatchObject({ allowWrite: false, enabled: true });
  });

  it("never trusts allowWrite on a production instance", () => {
    const raw = JSON.stringify([instance({ id: "p", name: "p", env: "prod", allowWrite: true })]);
    expect(parseInstances(raw)[0]?.allowWrite).toBe(false);
  });
});

describe("serializeInstances", () => {
  it("round-trips through parseInstances", () => {
    const list = [instance({ id: "a", name: "a" }), instance({ id: "b", name: "b", env: "preprod" })];
    expect(parseInstances(serializeInstances(list))).toEqual(list);
  });
});

describe("loopback is the one place cleartext is allowed", () => {
  it("accepts http on localhost, which is how a port-forwarded ArgoCD is reached", () => {
    expect(normalizeBaseUrl("http://localhost:8080")).toBe("http://localhost:8080");
  });

  it("accepts http on the loopback addresses, v4 and v6", () => {
    expect(normalizeBaseUrl("http://127.0.0.1:8080")).toBe("http://127.0.0.1:8080");
    expect(normalizeBaseUrl("http://[::1]:8080")).toBe("http://[::1]:8080");
  });

  it("still accepts https on localhost", () => {
    expect(normalizeBaseUrl("https://localhost:8080")).toBe("https://localhost:8080");
  });

  it("keeps refusing cleartext everywhere else, which is what protects a real token", () => {
    expect(() => normalizeBaseUrl("http://argocd.example.com")).toThrowError(/must use https/);
  });

  it("is not a substring match, so a lookalike host does not inherit the exemption", () => {
    expect(() => normalizeBaseUrl("http://localhost.example.com")).toThrowError(/must use https/);
    expect(() => normalizeBaseUrl("http://notlocalhost")).toThrowError(/must use https/);
    expect(() => normalizeBaseUrl("http://127.0.0.1.example.com")).toThrowError(/must use https/);
  });

  it("refuses a protocol that is neither http nor https even on loopback", () => {
    expect(() => normalizeBaseUrl("ftp://localhost")).toThrowError(/must use http or https/);
  });
});

describe("an edit can void the stored credential", () => {
  const base: ArgoInstance = {
    id: "i1",
    name: "prod",
    baseUrl: "https://argocd.example.com",
    env: "prod",
    authMode: "sso",
    allowWrite: false,
    enabled: true,
  };

  it("is voided by a new server, since the old provider's token would be sent to it", () => {
    expect(credentialsInvalidatedBy(base, { ...base, baseUrl: "https://other.example.com" })).toBe(true);
  });

  it("is voided by a new auth mode, whose provider reads different storage", () => {
    expect(credentialsInvalidatedBy(base, { ...base, authMode: "token" })).toBe(true);
    expect(credentialsInvalidatedBy(base, { ...base, authMode: "cli" })).toBe(true);
  });

  it("survives an edit that cannot affect who issued the token", () => {
    expect(credentialsInvalidatedBy(base, { ...base, name: "production" })).toBe(false);
    expect(credentialsInvalidatedBy(base, { ...base, enabled: false })).toBe(false);
    expect(credentialsInvalidatedBy(base, { ...base, allowWrite: true })).toBe(false);
    expect(credentialsInvalidatedBy(base, { ...base, env: "preprod" })).toBe(false);
  });
});
