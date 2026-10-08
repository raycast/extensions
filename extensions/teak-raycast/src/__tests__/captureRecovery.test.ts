import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { createRaycastApiMock } from "./raycastApiMock";

const toasts: Array<{ title: string; message?: string }> = [];
let savedTokens:
  | { accessToken: string; refreshToken?: string; isExpired: () => boolean }
  | undefined;
mock.module("@raycast/api", () => ({
  ...createRaycastApiMock(false, {
    oauthClient: class {
      getTokens() {
        return Promise.resolve(savedTokens);
      }
    },
  }),
  Toast: { Style: { Failure: "failure" } },
  showToast: (options: (typeof toasts)[number]) => {
    toasts.push(options);
    return Promise.resolve({});
  },
  open: () => Promise.resolve(),
}));
const { ensureCredentialsForNoViewCommand } = await import("../lib/capture");
const originalFetch = globalThis.fetch;
beforeEach(() => {
  toasts.length = 0;
  savedTokens = undefined;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test.each(["expired", "empty", "revoked-refresh-only"])(
  "no-view %s WorkOS credential shows Sign Out recovery and stops",
  async (state) => {
    const issuer = "https://scholarly-hay-77.authkit.app";
    globalThis.fetch = ((input) => {
      const url = String(input);
      if (url.includes("oauth-protected-resource")) {
        return Promise.resolve(
          Response.json({
            resource: "https://teakvault.com/mcp",
            authorization_servers: [issuer],
          }),
        );
      }
      if (url.includes("teak-oauth-clients")) {
        return Promise.resolve(
          Response.json({
            primary: "workos",
            issuer,
            clients: Object.fromEntries(
              ["cli", "raycast", "chrome", "firefox", "safari"].map((name) => [
                name,
                "client_raycast",
              ]),
            ),
          }),
        );
      }
      if (url.includes("oauth-authorization-server")) {
        return Promise.resolve(
          Response.json({
            issuer,
            code_challenge_methods_supported: ["S256"],
            authorization_endpoint: `${issuer}/authorize`,
            token_endpoint: `${issuer}/oauth2/token`,
          }),
        );
      }
      if (url.endsWith("/oauth2/token") && state === "revoked-refresh-only") {
        return Promise.resolve(
          Response.json({ error: "invalid_grant" }, { status: 400 }),
        );
      }
      throw new Error(
        "Background capture must not contact authentication or card endpoints",
      );
    }) as typeof fetch;
    const saved = {
      accessToken: state === "expired" ? "expired-access" : "",
      refreshToken:
        state === "revoked-refresh-only" ? "revoked-refresh" : undefined,
      isExpired: () => true,
    };
    savedTokens = saved;
    expect(await ensureCredentialsForNoViewCommand()).toBe(false);
    expect(savedTokens).toBe(saved);
    expect(toasts).toMatchObject([
      {
        title: "Sign Out required",
        message: "Open Search Cards, choose Sign Out, then sign in again.",
      },
    ]);
  },
);
test("no-view discovery outage shows a connection failure and stops", async () => {
  globalThis.fetch = (() =>
    Promise.reject(new Error("Offline"))) as typeof fetch;
  expect(await ensureCredentialsForNoViewCommand()).toBe(false);
  expect(toasts).toMatchObject([
    {
      title: "Unable to reach Teak",
      message: "Check your connection and try again.",
    },
  ]);
});
