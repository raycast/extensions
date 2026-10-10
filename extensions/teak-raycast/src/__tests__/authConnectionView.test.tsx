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
}) => createElement("button", { onClick: onAction }, title);
Object.assign(Action, { OpenInBrowser: Action, Open: Action });
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
    },
  }),
  Action,
  openExtensionPreferences: () => {},
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

// Failures: retry does nothing, discovery outage masquerades as signed out,
// saved credentials are ignored after recovery, or a retry opens the browser.
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
  if (state.isLoading) return createElement("p", null, "Checking session");
  if (state.error)
    return createElement(MissingApiKeyDetail, {
      error: state.error,
      onSignedIn: state.refresh,
    });
  return createElement(
    "p",
    null,
    state.isAuthenticated ? "Saved session accepted" : "Sign in required",
  );
}

test("real auth hook reports discovery failure and Retry recovers saved credentials", async () => {
  let available = false;
  let discoveryRequests = 0;
  const issuer = "https://scholarly-hay-77.authkit.app";
  globalThis.fetch = ((input) => {
    discoveryRequests += 1;
    if (!available) return Promise.resolve(new Response(null, { status: 503 }));
    const url = String(input);
    const body = url.includes("oauth-protected-resource")
      ? {
          resource: "https://teakvault.com/mcp",
          authorization_servers: [issuer],
        }
      : url.includes("teak-oauth-clients")
        ? {
            issuer,
            primary: "workos",
            clients: Object.fromEntries(
              ["cli", "raycast", "chrome", "firefox", "safari"].map(
                (surface) => [surface, "client_01M47GV3CYKFW0H78W0XYKGTM5"],
              ),
            ),
          }
        : {
            issuer,
            code_challenge_methods_supported: ["S256"],
            authorization_endpoint: `${issuer}/authorize`,
            token_endpoint: `${issuer}/oauth2/token`,
          };
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
