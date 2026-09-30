/**
 * The one part of single sign-on that cannot be a pure function: listening on a loopback port
 * and opening a browser.
 *
 * Kept as thin as it can be, because none of it is unit-testable. Everything it decides is
 * delegated to `lib/auth/oidc.ts`; what is left here is a socket, a browser and a timeout.
 *
 * The port is 8085 and the path is /auth/callback, matching what the argocd CLI uses. That is
 * deliberate: one redirect URI registered with the identity provider then serves both the CLI
 * and this extension, so nobody has to ask for a second one.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { open } from "@raycast/api";
import { fetchOidcSettings, type OidcSettings } from "../lib/argocd/settings";
import {
  OidcError,
  buildAuthorizeUrl,
  createPkce,
  discover,
  exchangeCode,
  parseCallback,
  escapeHtml,
} from "../lib/auth/oidc";
import { sessionFromTokens, type SsoSession } from "../lib/auth/session";
import type { ArgoInstance } from "../lib/config/instances";

export const CALLBACK_PORT = 8085;
export const CALLBACK_PATH = "/auth/callback";
export const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}${CALLBACK_PATH}`;

const LOGIN_TIMEOUT_MS = 180_000;

/** What the browser tab shows once the provider has redirected back. */
function completionPage(message: string): string {
  return `<!doctype html><meta charset="utf-8"><title>ArgoCD</title><body style="font:16px -apple-system,sans-serif;padding:3rem;color:#222"><p>${escapeHtml(message)}</p><p style="color:#777">You can close this tab and go back to Raycast.</p></body>`;
}

interface Callback {
  code: string;
  state: string;
}

/**
 * Serves exactly one request on the callback path and resolves with it. Anything else gets a
 * 404, so an unrelated request on the port cannot end the login.
 */
function awaitCallback(signal: AbortSignal): Promise<Callback> {
  return new Promise<Callback>((resolve, reject) => {
    const server = createServer((request: IncomingMessage, response: ServerResponse) => {
      const url = request.url ?? "/";
      if (!url.startsWith(CALLBACK_PATH)) {
        response.writeHead(404).end();
        return;
      }

      try {
        const callback = parseCallback(url);
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end(completionPage("Signed in to ArgoCD."));
        server.close();
        resolve(callback);
      } catch (error) {
        response.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        response.end(completionPage(`The sign-in did not complete: ${(error as Error).message}`));
        server.close();
        reject(error);
      }
    });

    server.on("error", (error: NodeJS.ErrnoException) => {
      reject(
        error.code === "EADDRINUSE"
          ? new OidcError(
              `Port ${CALLBACK_PORT} is already in use, so the sign-in has nowhere to come back to. Close whatever is listening on it, an argocd login in another window for instance, and try again.`,
              "port_in_use",
            )
          : error,
      );
    });

    signal.addEventListener("abort", () => {
      server.close();
      reject(
        new OidcError("The sign-in was not completed in time. Run it again and finish it in the browser.", "timeout"),
      );
    });

    // 127.0.0.1 rather than every interface: the only client that should ever reach this is a
    // browser on this machine.
    server.listen(CALLBACK_PORT, "127.0.0.1");
  });
}

export interface LoginResult {
  session: SsoSession;
  settings: OidcSettings;
}

/**
 * Runs the whole browser login for one instance and returns the session to store.
 *
 * The provider configuration comes from the instance itself, so the extension carries none and
 * pointing it at another ArgoCD needs nothing but its URL.
 */
export async function loginWithSso(instance: ArgoInstance): Promise<LoginResult> {
  const settings = await fetchOidcSettings(instance.baseUrl, { fetch: globalThis.fetch });
  const endpoints = await discover(settings.issuer, { fetch: globalThis.fetch });

  const pkce = createPkce({
    randomBytes: (length) => new Uint8Array(randomBytes(length)),
    sha256: (input) => new Uint8Array(createHash("sha256").update(input).digest()),
  });
  const state = randomBytes(16).toString("base64url");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);
  const pending = awaitCallback(controller.signal);

  try {
    await open(
      buildAuthorizeUrl({
        endpoints,
        clientId: settings.clientId,
        redirectUri: REDIRECT_URI,
        scopes: settings.scopes,
        pkce,
        state,
      }),
    );

    const callback = await pending;
    if (callback.state !== state) {
      // A mismatched state means the redirect did not come from the request that was made.
      throw new OidcError("The sign-in response did not match the request that started it.", "state");
    }

    const tokens = await exchangeCode(
      {
        endpoints,
        clientId: settings.clientId,
        redirectUri: REDIRECT_URI,
        code: callback.code,
        verifier: pkce.verifier,
      },
      { fetch: globalThis.fetch, now: () => Date.now() },
    );

    if (!tokens.refreshToken) {
      // Worth saying out loud: without it, this mode is no better than pasting a token.
      throw new OidcError(
        "The identity provider returned no refresh token, so the session could not be renewed silently. The client needs the refresh_token grant and the offline_access scope.",
        "no_refresh_token",
      );
    }

    return {
      session: sessionFromTokens(tokens, settings.issuer, settings.clientId, instance.baseUrl),
      settings,
    };
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
