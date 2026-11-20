import { afterAll, afterEach, beforeEach, expect, mock, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { act, createElement, type ReactNode } from "react";
import { createRaycastApiMock } from "./raycastApiMock";

const transportGlobals = {
  Response,
  Request,
  Headers,
  ReadableStream,
  WritableStream,
  TransformStream,
};
GlobalRegistrator.register();
// Keep the network stream realm consistent with Bun while mounting native UI.
Object.assign(globalThis, transportGlobals);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import("react-dom/client");
const originalFetch = globalThis.fetch;
let browserCount = 0;
const Action = ({
  title,
  onAction,
}: {
  title: string;
  onAction?: () => void;
}) => createElement("button", { onClick: onAction, type: "button" }, title);
Object.assign(Action, {
  OpenInBrowser: Action,
  Open: Action,
  Style: { Destructive: "destructive" },
});
mock.module("@raycast/api", () => ({
  ...createRaycastApiMock(false, {
    getPreferenceValues: () => ({ apiKey: "" }),
    oauthClient: class {
      getTokens() {
        return Promise.resolve({
          accessToken: "saved",
          isExpired: () => false,
        });
      }
      authorize() {
        browserCount += 1;
        throw new Error("Unexpected browser");
      }
      removeTokens() {
        return Promise.resolve();
      }
    },
  }),
  Action,
  openExtensionPreferences: () => undefined,
  showToast: () => Promise.resolve(),
  Toast: { Style: { Failure: "failure" } },
  ActionPanel: ({ children }: { children: ReactNode }) =>
    createElement("nav", null, children),
  Detail: ({ markdown, actions }: { markdown: string; actions: ReactNode }) =>
    createElement("main", null, markdown, actions),
  Icon: { Globe: "globe", Key: "key" },
}));
const { MissingApiKeyDetail } =
  await import("../components/MissingApiKeyDetail");
const { useTeakAuth } = await import("../lib/useTeakAuth");
const { SignOutAction } = await import("../components/SignOutAction");
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  browserCount = 0;
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  globalThis.fetch = originalFetch;
});
afterAll(() => GlobalRegistrator.unregister());

test("connection recovery renders and invokes its supplied retry handler", async () => {
  let retries = 0;
  await act(async () =>
    root.render(
      createElement(MissingApiKeyDetail, {
        error: "Unable to reach Teak. Check your connection and retry.",
        onSignedIn: () => {
          retries += 1;
        },
      }),
    ),
  );
  expect(container.textContent).toContain("Connection unavailable");
  expect(container.textContent).not.toContain("Sign in with Browser");
  expect(container.textContent).not.toContain("Set API Key");
  const button = container.querySelector("button");
  expect(button?.textContent).toBe("Retry Connection");
  await act(async () => button?.click());
  expect(retries).toBe(1);
});

function AuthView() {
  const state = useTeakAuth();
  if (state.isLoading) {
    return createElement("p", null, "Checking session");
  }
  if (state.error) {
    return createElement(MissingApiKeyDetail, {
      error: state.error,
      onSignedIn: state.refresh,
    });
  }
  return createElement(
    "p",
    null,
    state.isAuthenticated ? "Saved session accepted" : "Sign in required",
  );
}

test("real auth hook reports discovery failure and Retry recovers saved credentials", async () => {
  let available = false as boolean;
  let discoveryRequests = 0;
  const issuer = "https://scholarly-hay-77.authkit.app";
  globalThis.fetch = ((input) => {
    discoveryRequests += 1;
    if (!available) {
      return Promise.resolve(new Response(null, { status: 503 }));
    }
    const url = String(input);
    const discoveryBody = () => {
      if (url.includes("oauth-protected-resource")) {
        return {
          resource: "https://teakvault.com/mcp",
          authorization_servers: [issuer],
        };
      }
      if (url.includes("teak-oauth-clients")) {
        return {
          issuer,
          primary: "workos",
          clients: Object.fromEntries(
            ["cli", "raycast", "chrome", "firefox", "safari"].map((surface) => [
              surface,
              "client_01M47GV3CYKFW0H78W0XYKGTM5",
            ]),
          ),
          resource: "https://teakvault.com/mcp",
          authorization_endpoint: `${issuer}/authorize`,
          token_endpoint: `${issuer}/oauth2/token`,
          code_challenge_methods_supported: ["S256"],
        };
      }
      return {
        issuer,
        code_challenge_methods_supported: ["S256"],
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/oauth2/token`,
      };
    };
    const body = discoveryBody();
    return Promise.resolve(Response.json(body));
  }) as typeof fetch;
  await act(async () => root.render(createElement(AuthView)));
  expect(container.textContent).toContain("Connection unavailable");
  expect(container.textContent).not.toContain("Sign in required");
  expect(container.textContent).not.toContain("Sign in with Browser");
  const previousRequests = discoveryRequests;
  available = true;
  await act(async () => container.querySelector("button")?.click());
  expect(discoveryRequests).toBeGreaterThan(previousRequests);
  expect(container.textContent).toBe("Saved session accepted");
  expect(browserCount).toBe(0);
});

// Teak's OAuth discovery, so sign-in and sign-out find the provider offline.
const serveDiscovery = () => {
  const issuer = "https://scholarly-hay-77.authkit.app";
  globalThis.fetch = ((input) => {
    const url = String(input);
    if (url.includes("oauth-protected-resource")) {
      return Promise.resolve(
        Response.json({
          authorization_servers: [issuer],
          resource: "https://teakvault.com/mcp",
        }),
      );
    }
    if (url.includes("teak-oauth-clients")) {
      return Promise.resolve(
        Response.json({
          clients: Object.fromEntries(
            ["cli", "raycast", "chrome", "firefox", "safari"].map((surface) => [
              surface,
              "client_01M47GV3CYKFW0H78W0XYKGTM5",
            ]),
          ),
          issuer,
          primary: "workos",
          resource: "https://teakvault.com/mcp",
          authorization_endpoint: `${issuer}/authorize`,
          token_endpoint: `${issuer}/oauth2/token`,
          code_challenge_methods_supported: ["S256"],
        }),
      );
    }
    return Promise.resolve(
      Response.json({
        authorization_endpoint: `${issuer}/authorize`,
        code_challenge_methods_supported: ["S256"],
        issuer,
        token_endpoint: `${issuer}/oauth2/token`,
      }),
    );
  }) as typeof fetch;
};

test("a signed-out view starts sign-in right away and reuses a saved session", async () => {
  serveDiscovery();
  let signedIn = 0;
  await act(async () =>
    root.render(
      createElement(MissingApiKeyDetail, {
        onSignedIn: () => {
          signedIn += 1;
        },
      }),
    ),
  );
  await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
  expect(signedIn).toBe(1);
  expect(browserCount).toBe(0);
});

// Last: signing out holds for the rest of the run, as it does in Raycast.
test("after Sign Out, the signed-out view waits instead of opening sign-in", async () => {
  serveDiscovery();
  const discovery = globalThis.fetch;
  const steps: string[] = [];
  globalThis.fetch = ((input, init) => {
    if (String(input).endsWith("/oauth/disconnect")) {
      steps.push("disconnect");
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return discovery(input, init);
  }) as typeof fetch;
  let signedOut = 0;
  await act(() => {
    root.render(
      createElement(SignOutAction, {
        // A change still waiting to save finishes while signed in.
        beforeSignOut: async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          steps.push("before");
        },
        onSignedOut: () => {
          signedOut += 1;
        },
      }),
    );
    return Promise.resolve();
  });
  const signOut = container.querySelector("button");
  expect(signOut?.textContent).toBe("Sign Out");
  await act(async () => signOut?.click());
  await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
  expect(signedOut).toBe(1);
  expect(steps).toEqual(["before", "disconnect"]);

  let signedIn = 0;
  await act(() => {
    root.render(
      createElement(MissingApiKeyDetail, {
        onSignedIn: () => {
          signedIn += 1;
        },
      }),
    );
    return Promise.resolve();
  });
  await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
  expect(container.textContent).toContain("You're signed out.");
  expect(container.textContent).toContain("Sign in with Browser");
  expect(signedIn).toBe(0);
  expect(browserCount).toBe(0);
});
