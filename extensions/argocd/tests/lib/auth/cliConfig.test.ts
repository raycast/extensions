import { describe, expect, it, vi } from "vitest";
import {
  decodeJwtExpiry,
  extractToken,
  isExpired,
  readCliToken,
  type CliToken,
} from "../../../src/lib/auth/cliConfig";

/** Builds a syntactically valid JWT with no signature, so no real token is ever committed. */
function fakeJwt(payload: Record<string, unknown>, options: { pad?: boolean } = {}): string {
  const encode = (value: object) => {
    const base64 = Buffer.from(JSON.stringify(value)).toString("base64");
    const url = base64.replace(/\+/g, "-").replace(/\//g, "_");
    return options.pad === false ? url : url.replace(/=+$/, "");
  };
  return `${encode({ alg: "RS256", typ: "JWT" })}.${encode(payload)}.c2lnbmF0dXJl`;
}

const CONFIG = `contexts:
  - name: argocd.example.com
    server: argocd.example.com
    user: argocd.example.com
servers:
  - grpc-web-root-path: ""
    server: argocd.example.com
users:
  - auth-token: TOKEN_ONE
    name: argocd.example.com
    refresh-token: REFRESH_ONE
  - auth-token: TOKEN_TWO
    name: argocd.example.com:8443
  - name: no-token.example.com
current-context: argocd.example.com
`;

describe("decodeJwtExpiry", () => {
  it("reads the exp claim", () => {
    const token = fakeJwt({ exp: 1757280000, sub: "someone" });
    expect(decodeJwtExpiry(token)?.getTime()).toBe(1757280000 * 1000);
  });

  it("handles a payload whose base64url length is not a multiple of four", () => {
    // A single-key payload lands on a length needing padding; the decoder must add it back.
    const token = fakeJwt({ exp: 1757280001 });
    expect(token.split(".")[1]?.length ?? 0).not.toBe(0);
    expect(decodeJwtExpiry(token)?.getTime()).toBe(1757280001 * 1000);
  });

  it("returns undefined for a token that is not a JWT", () => {
    expect(decodeJwtExpiry("opaque-token")).toBeUndefined();
    expect(decodeJwtExpiry("only.two")).toBeUndefined();
    expect(decodeJwtExpiry("")).toBeUndefined();
  });

  it("returns undefined when the payload is not base64url", () => {
    expect(decodeJwtExpiry("aaa.!!!not-base64!!!.bbb")).toBeUndefined();
  });

  it("returns undefined when the payload is not JSON", () => {
    const notJson = Buffer.from("hello").toString("base64url");
    expect(decodeJwtExpiry(`aaa.${notJson}.bbb`)).toBeUndefined();
  });

  it("returns undefined when exp is missing or not a number", () => {
    expect(decodeJwtExpiry(fakeJwt({ sub: "someone" }))).toBeUndefined();
    expect(decodeJwtExpiry(fakeJwt({ exp: "soon" }))).toBeUndefined();
  });
});

describe("isExpired", () => {
  const at = (iso: string): CliToken => ({ token: "t", expiresAt: new Date(iso), refreshToken: undefined });

  it("is true once the expiry has passed", () => {
    expect(isExpired(at("2026-09-08T10:00:00Z"), new Date("2026-09-08T10:00:01Z"))).toBe(true);
  });

  it("is true inside the default clock skew", () => {
    expect(isExpired(at("2026-09-08T10:00:20Z"), new Date("2026-09-08T10:00:00Z"))).toBe(true);
  });

  it("is false comfortably before the expiry", () => {
    expect(isExpired(at("2026-09-08T11:00:00Z"), new Date("2026-09-08T10:00:00Z"))).toBe(false);
  });

  it("is false for an opaque token with no local expiry, letting the server decide", () => {
    expect(isExpired({ token: "t", expiresAt: undefined, refreshToken: undefined }, new Date())).toBe(false);
  });

  it("honours an explicit skew", () => {
    expect(isExpired(at("2026-09-08T10:05:00Z"), new Date("2026-09-08T10:00:00Z"), 600)).toBe(true);
  });
});

describe("extractToken", () => {
  it("finds the token for a host", () => {
    expect(extractToken(CONFIG, "argocd.example.com")?.token).toBe("TOKEN_ONE");
  });

  it("matches a host with a port only against the entry carrying that port", () => {
    expect(extractToken(CONFIG, "argocd.example.com:8443")?.token).toBe("TOKEN_TWO");
    expect(extractToken(CONFIG, "argocd.example.com:9999")).toBeUndefined();
  });

  it("returns undefined for an unknown host", () => {
    expect(extractToken(CONFIG, "other.example.com")).toBeUndefined();
  });

  it("returns undefined when the matching user carries no token", () => {
    expect(extractToken(CONFIG, "no-token.example.com")).toBeUndefined();
  });

  it("returns undefined for empty or malformed YAML", () => {
    expect(extractToken("", "argocd.example.com")).toBeUndefined();
    expect(extractToken("users: [ unterminated", "argocd.example.com")).toBeUndefined();
    expect(extractToken("users: not-a-list", "argocd.example.com")).toBeUndefined();
  });

  it("carries the decoded expiry when the token is a JWT", () => {
    const jwt = fakeJwt({ exp: 1757280000 });
    const yaml = `users:\n  - name: argocd.example.com\n    auth-token: ${jwt}\n`;
    expect(extractToken(yaml, "argocd.example.com")?.expiresAt?.getTime()).toBe(1757280000 * 1000);
  });
});

describe("readCliToken", () => {
  it("reads the default argocd config path", async () => {
    const readFile = vi.fn().mockResolvedValue(CONFIG);
    const token = await readCliToken("argocd.example.com", { readFile });
    expect(token?.token).toBe("TOKEN_ONE");
    expect(readFile.mock.calls[0]?.[0]).toMatch(/\.config\/argocd\/config$/);
  });

  it("honours an explicit config path", async () => {
    const readFile = vi.fn().mockResolvedValue(CONFIG);
    await readCliToken("argocd.example.com", { readFile, configPath: "/somewhere/config" });
    expect(readFile).toHaveBeenCalledWith("/somewhere/config");
  });

  it("returns undefined when the config file does not exist", async () => {
    const readFile = vi.fn().mockRejectedValue(Object.assign(new Error("no such file"), { code: "ENOENT" }));
    await expect(readCliToken("argocd.example.com", { readFile })).resolves.toBeUndefined();
  });

  it("returns undefined when the config file cannot be read at all", async () => {
    const readFile = vi.fn().mockRejectedValue(new Error("EACCES"));
    await expect(readCliToken("argocd.example.com", { readFile })).resolves.toBeUndefined();
  });
});
